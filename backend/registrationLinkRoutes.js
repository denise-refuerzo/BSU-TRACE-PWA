const crypto = require('crypto');
const bcrypt = require('bcrypt');

const ACTIVE_ASSIGNMENT_SQL = `
  aa.is_active IS TRUE
  AND (aa.starts_on IS NULL OR aa.starts_on <= CURRENT_DATE)
  AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
`;

const normalizeUniversityEmail = value => String(value || '').trim().toLowerCase();
const isUniversityEmail = value => /^[a-z0-9._%+-]+@g\.batstate-u\.edu\.ph$/.test(value);
const passwordRequirementError = value => {
  const password = String(value || '');
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9\s]/.test(password)) return 'Password must include at least one special character.';
  if (password.length > 128) return 'Password must not exceed 128 characters.';
  return null;
};
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function inviteSecret() {
  const base = process.env.REGISTRATION_LINK_SECRET || process.env.JWT_SECRET;
  if (!base) throw new Error('REGISTRATION_LINK_SECRET or JWT_SECRET is required.');
  return crypto.createHash('sha256').update(`bsu-trace-registration:${base}`).digest();
}

function buildRegistrationToken(publicId) {
  const signature = crypto.createHmac('sha256', inviteSecret()).update(String(publicId)).digest('base64url');
  return `${publicId}.${signature}`;
}

function parseRegistrationToken(token) {
  const value = String(token || '');
  const separator = value.indexOf('.');
  if (separator < 1) return null;
  const publicId = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(publicId)) return null;
  const expectedSignature = crypto.createHmac('sha256', inviteSecret()).update(publicId).digest('base64url');
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  return { publicId, tokenHash: sha256(value) };
}

const registrationPath = publicId => `/register/${encodeURIComponent(buildRegistrationToken(publicId))}`;

async function refreshTerminalStatuses(db) {
  await db.query(`
    UPDATE public.registration_links
    SET status = CASE
      WHEN registration_count >= max_registrations THEN 'exhausted'
      WHEN expires_at <= now() THEN 'expired'
      ELSE status
    END,
    updated_at = now()
    WHERE status = 'active'
      AND (registration_count >= max_registrations OR expires_at <= now())
  `);
}

async function audit(db, { actorUserId = null, targetUserId = null, linkId = null, action, details = {} }) {
  await db.query(`
    INSERT INTO public.account_administration_audit
      (actor_user_id,target_user_id,registration_link_id,action,details)
    VALUES ($1,$2,$3,$4,$5::jsonb)
  `, [actorUserId, targetUserId, linkId, action, JSON.stringify(details)]);
}

function emitRegistrationUpdate(req, requesterPublicId, event = 'registration-link-updated') {
  const socketServer = req.app.get('io');
  socketServer?.to('ict_admin_room').emit(event);
  socketServer?.to('ict_admin_room').emit('account-registry-updated');
  if (requesterPublicId) socketServer?.to(`user_${requesterPublicId}`).emit(event);
}

const baseListSql = `
  SELECT rl.public_id AS link_id,rl.account_type,rl.office_id,rl.department_id,
         rl.requested_max_registrations,rl.requested_expires_at,rl.max_registrations,
         rl.registration_count,rl.expires_at,rl.status,rl.request_note,rl.decision_note,
         rl.created_at,rl.approved_at,requester.public_id AS requester_id,
         requester.full_name AS requested_by,approver.full_name AS approved_by,
         o.office_name,d.department_name,a.account_type AS account_type_name,
         COALESCE((
           SELECT json_agg(json_build_object(
             'userId',registered.public_id,'fullName',registered.full_name,
             'email',registered.uni_email,'username',registered.username,
             'registeredAt',origin.registered_at
           ) ORDER BY origin.registered_at DESC)
           FROM public.account_registration_origins origin
           JOIN public.\"User\" registered ON registered.u_id=origin.u_id
           WHERE origin.link_id=rl.link_id
         ), '[]'::json) AS registered_accounts
  FROM public.registration_links rl
  JOIN public.\"User\" requester ON requester.u_id=rl.requested_by
  LEFT JOIN public.\"User\" approver ON approver.u_id=rl.approved_by
  LEFT JOIN public.offices o ON o.o_id=rl.office_id
  LEFT JOIN public.department d ON d.d_id=rl.department_id
  JOIN public.account a ON a.a_id=rl.account_type
`;

module.exports = function registerRegistrationLinkRoutes(app, pool, requireAuth, limiters = {}) {
  const requireIct = (req, res) => {
    if (Number(req.user.a_id) !== 5) {
      res.status(403).json({ error: 'ICT Administrator access is required.' });
      return false;
    }
    return true;
  };

  app.get('/api/registration-links/context', requireAuth, async (req, res) => {
    if (![2, 3].includes(Number(req.user.a_id))) return res.status(403).json({ error: 'Only authorized office accounts can request registration links.' });
    try {
      const result = await pool.query(`
        SELECT aa.scope_type,aa.office_id,aa.department_id,o.office_name,d.department_name
        FROM public.account_access_assignments aa
        LEFT JOIN public.offices o ON o.o_id=aa.office_id
        LEFT JOIN public.department d ON d.d_id=aa.department_id
        WHERE aa.u_id=$1 AND aa.can_request_registration IS TRUE AND ${ACTIVE_ASSIGNMENT_SQL}
        ORDER BY aa.scope_type,COALESCE(o.office_name,d.department_name)
      `, [req.user.u_id]);
      res.json({
        canRequest: result.rowCount > 0,
        offices: result.rows.filter(row => row.scope_type === 'office'),
        departments: result.rows.filter(row => row.scope_type === 'department')
      });
    } catch (error) {
      console.error('Unable to load registration authority:', error);
      res.status(500).json({ error: 'Unable to load registration authority.' });
    }
  });

  const passThrough = (req, res, next) => next();
  const requestLimiter = limiters.request || passThrough;
  const publicReadLimiter = limiters.publicRead || passThrough;
  const publicWriteLimiter = limiters.publicWrite || passThrough;

  app.post('/api/registration-links/requests', requestLimiter, requireAuth, async (req, res) => {
    if (![2, 3].includes(Number(req.user.a_id))) return res.status(403).json({ error: 'Only authorized office accounts can request registration links.' });
    const accountType = Number(req.body.accountType);
    const targetId = Number(req.body.targetId);
    const requestedLimit = Number(req.body.maxRegistrations);
    const requestedExpiresAt = new Date(req.body.expiresAt);
    const requestNote = String(req.body.requestNote || '').trim().slice(0, 500) || null;
    const scopeType = accountType === 1 ? 'department' : accountType === 2 ? 'office' : null;
    if (!scopeType || !Number.isInteger(targetId) || targetId < 1) return res.status(400).json({ error: 'Choose a valid account type and assigned area.' });
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) return res.status(400).json({ error: 'Registration limit must be between 1 and 100 accounts.' });
    const now = Date.now();
    if (Number.isNaN(requestedExpiresAt.getTime()) || requestedExpiresAt.getTime() <= now || requestedExpiresAt.getTime() > now + 90 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Expiration must be in the future and no more than 90 days away.' });
    }
    try {
      const allowed = await pool.query(`
        SELECT 1 FROM public.account_access_assignments aa
        WHERE aa.u_id=$1 AND aa.scope_type=$2
          AND ${scopeType === 'office' ? 'aa.office_id' : 'aa.department_id'}=$3
          AND aa.can_request_registration IS TRUE AND ${ACTIVE_ASSIGNMENT_SQL}
      `, [req.user.u_id, scopeType, targetId]);
      if (!allowed.rowCount) return res.status(403).json({ error: 'You are not authorized to request registrations for that area.' });
      const created = await pool.query(`
        INSERT INTO public.registration_links
          (requested_by,account_type,office_id,department_id,requested_max_registrations,requested_expires_at,request_note)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING link_id,public_id
      `, [req.user.u_id, accountType, scopeType === 'office' ? targetId : null,
        scopeType === 'department' ? targetId : null, requestedLimit, requestedExpiresAt, requestNote]);
      await audit(pool, { actorUserId: req.user.u_id, linkId: created.rows[0].link_id, action: 'registration_link_requested', details: { accountType, scopeType, targetId, requestedLimit } });
      emitRegistrationUpdate(req, req.user.public_id);
      res.status(201).json({ message: 'Registration link request sent to ICT.', requestId: created.rows[0].public_id });
    } catch (error) {
      console.error('Unable to request registration link:', error);
      res.status(500).json({ error: 'Unable to submit the registration link request.' });
    }
  });

  app.get('/api/registration-links/my', requireAuth, async (req, res) => {
    try {
      await refreshTerminalStatuses(pool);
      const result = await pool.query(`${baseListSql} WHERE rl.requested_by=$1 ORDER BY rl.created_at DESC`, [req.user.u_id]);
      res.json(result.rows.map(row => ({
        ...row,
        registration_path: ['active'].includes(row.status) ? registrationPath(row.link_id) : null
      })));
    } catch (error) {
      console.error('Unable to load requested registration links:', error);
      res.status(500).json({ error: 'Unable to load your registration links.' });
    }
  });

  app.get('/api/admin/registration-links', requireAuth, async (req, res) => {
    if (!requireIct(req, res)) return;
    try {
      await refreshTerminalStatuses(pool);
      const result = await pool.query(`${baseListSql} ORDER BY CASE rl.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,rl.created_at DESC`);
      res.json(result.rows.map(row => ({
        ...row,
        registration_path: row.status === 'active' ? registrationPath(row.link_id) : null
      })));
    } catch (error) {
      console.error('Unable to load registration management:', error);
      res.status(500).json({ error: 'Unable to load registration management.' });
    }
  });

  app.patch('/api/admin/registration-links/:linkId/approve', requireAuth, async (req, res) => {
    if (!requireIct(req, res)) return;
    const maxRegistrations = Number(req.body.maxRegistrations);
    const expiresAt = new Date(req.body.expiresAt);
    const decisionNote = String(req.body.decisionNote || '').trim().slice(0, 500) || null;
    const now = Date.now();
    if (!Number.isInteger(maxRegistrations) || maxRegistrations < 1 || maxRegistrations > 100) return res.status(400).json({ error: 'Registration limit must be between 1 and 100 accounts.' });
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now || expiresAt.getTime() > now + 90 * 24 * 60 * 60 * 1000) return res.status(400).json({ error: 'Expiration must be in the future and no more than 90 days away.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(`
        SELECT rl.link_id,rl.public_id,rl.status,requester.public_id AS requester_public_id
        FROM public.registration_links rl JOIN public.\"User\" requester ON requester.u_id=rl.requested_by
        WHERE rl.public_id=$1 FOR UPDATE OF rl
      `, [req.params.linkId]);
      if (!current.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Registration request not found.' }); }
      if (current.rows[0].status !== 'pending') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Only pending requests can be approved.' }); }
      const token = buildRegistrationToken(current.rows[0].public_id);
      await client.query(`
        UPDATE public.registration_links
        SET approved_by=$1,max_registrations=$2,expires_at=$3,token_hash=$4,status='active',
            decision_note=$5,approved_at=now(),updated_at=now()
        WHERE link_id=$6
      `, [req.user.u_id, maxRegistrations, expiresAt, sha256(token), decisionNote, current.rows[0].link_id]);
      await audit(client, { actorUserId: req.user.u_id, linkId: current.rows[0].link_id, action: 'registration_link_approved', details: { maxRegistrations, expiresAt: expiresAt.toISOString() } });
      await client.query('COMMIT');
      emitRegistrationUpdate(req, current.rows[0].requester_public_id);
      res.json({ message: 'Registration link approved.', registrationPath: registrationPath(current.rows[0].public_id) });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Unable to approve registration link:', error);
      res.status(500).json({ error: 'Unable to approve the registration link.' });
    } finally { client.release(); }
  });

  app.patch('/api/admin/registration-links/:linkId/status', requireAuth, async (req, res) => {
    if (!requireIct(req, res)) return;
    const status = req.body.status === 'rejected' ? 'rejected' : req.body.status === 'revoked' ? 'revoked' : null;
    const decisionNote = String(req.body.decisionNote || '').trim().slice(0, 500) || null;
    if (!status) return res.status(400).json({ error: 'Choose rejected or revoked.' });
    try {
      const result = await pool.query(`
        UPDATE public.registration_links rl
        SET status=$1,decision_note=$2,revoked_at=CASE WHEN $1='revoked' THEN now() ELSE revoked_at END,updated_at=now()
        FROM public.\"User\" requester
        WHERE rl.public_id=$3 AND requester.u_id=rl.requested_by
          AND (($1='rejected' AND rl.status='pending') OR ($1='revoked' AND rl.status='active'))
        RETURNING rl.link_id,requester.public_id AS requester_public_id
      `, [status, decisionNote, req.params.linkId]);
      if (!result.rowCount) return res.status(409).json({ error: `This request cannot be ${status}.` });
      await audit(pool, { actorUserId: req.user.u_id, linkId: result.rows[0].link_id, action: `registration_link_${status}`, details: { decisionNote } });
      emitRegistrationUpdate(req, result.rows[0].requester_public_id);
      res.json({ message: `Registration link ${status}.` });
    } catch (error) {
      console.error(`Unable to mark registration link ${status}:`, error);
      res.status(500).json({ error: 'Unable to update the registration link.' });
    }
  });

  app.get('/api/public/registration-links/:token', publicReadLimiter, async (req, res) => {
    const parsed = parseRegistrationToken(req.params.token);
    if (!parsed) return res.status(404).json({ error: 'This registration link is invalid.' });
    try {
      await refreshTerminalStatuses(pool);
      const result = await pool.query(`
        SELECT rl.account_type,rl.max_registrations,rl.registration_count,rl.expires_at,rl.status,
               o.office_name,d.department_name,a.account_type AS account_type_name
        FROM public.registration_links rl
        LEFT JOIN public.offices o ON o.o_id=rl.office_id
        LEFT JOIN public.department d ON d.d_id=rl.department_id
        JOIN public.account a ON a.a_id=rl.account_type
        WHERE rl.public_id=$1 AND rl.token_hash=$2
      `, [parsed.publicId, parsed.tokenHash]);
      if (!result.rowCount) return res.status(404).json({ error: 'This registration link is invalid.' });
      const link = result.rows[0];
      if (link.status !== 'active') return res.status(410).json({ error: `This registration link is ${link.status}.`, status: link.status });
      res.json({
        accountType: Number(link.account_type), accountTypeName: link.account_type_name,
        officeName: link.office_name, departmentName: link.department_name,
        expiresAt: link.expires_at, remainingRegistrations: Number(link.max_registrations) - Number(link.registration_count)
      });
    } catch (error) {
      console.error('Unable to validate registration link:', error);
      res.status(500).json({ error: 'Unable to validate this registration link.' });
    }
  });

  app.post('/api/public/registration-links/:token/register', publicWriteLimiter, async (req, res) => {
    const parsed = parseRegistrationToken(req.params.token);
    if (!parsed) return res.status(404).json({ error: 'This registration link is invalid.' });
    const username = String(req.body.username || '').trim();
    const fullName = String(req.body.fullName || '').trim();
    const password = String(req.body.password || '');
    const facultyId = String(req.body.facultyId || '').trim() || null;
    const email = normalizeUniversityEmail(req.body.email);
    if (!username || !fullName) return res.status(400).json({ error: 'Enter your full name and username.' });
    const passwordError = passwordRequirementError(password);
    if (passwordError) return res.status(400).json({ error: passwordError });
    if (!isUniversityEmail(email)) return res.status(400).json({ error: 'Use an official university email ending in @g.batstate-u.edu.ph.' });

    let hashedPassword;
    try { hashedPassword = await bcrypt.hash(password, 10); }
    catch { return res.status(500).json({ error: 'Unable to secure the account password.' }); }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const linkResult = await client.query(`
        SELECT rl.*,requester.public_id AS requester_public_id
        FROM public.registration_links rl JOIN public.\"User\" requester ON requester.u_id=rl.requested_by
        WHERE rl.public_id=$1 AND rl.token_hash=$2 FOR UPDATE OF rl
      `, [parsed.publicId, parsed.tokenHash]);
      if (!linkResult.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'This registration link is invalid.' }); }
      const link = linkResult.rows[0];
      if (link.status !== 'active' || new Date(link.expires_at).getTime() <= Date.now() || Number(link.registration_count) >= Number(link.max_registrations)) {
        const terminalStatus = Number(link.registration_count) >= Number(link.max_registrations) ? 'exhausted' : new Date(link.expires_at).getTime() <= Date.now() ? 'expired' : link.status;
        if (link.status === 'active') await client.query('UPDATE public.registration_links SET status=$1,updated_at=now() WHERE link_id=$2', [terminalStatus, link.link_id]);
        await client.query('COMMIT');
        emitRegistrationUpdate(req, link.requester_public_id);
        return res.status(410).json({ error: `This registration link is ${terminalStatus}.`, status: terminalStatus });
      }
      const duplicate = await client.query(`SELECT 1 FROM public.\"User\" WHERE LOWER(username)=LOWER($1) OR LOWER(BTRIM(uni_email))=$2 LIMIT 1`, [username, email]);
      if (duplicate.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'That username or university email is already registered.' }); }
      const created = await client.query(`
        INSERT INTO public.\"User\" (a_id,d_id,username,password,full_name,uni_email,faculty_id,o_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING u_id,public_id
      `, [link.account_type, link.department_id, username, hashedPassword, fullName, email, facultyId, link.office_id]);
      await client.query('INSERT INTO public.account_registration_origins (u_id,link_id) VALUES ($1,$2)', [created.rows[0].u_id, link.link_id]);
      const nextCount = Number(link.registration_count) + 1;
      const nextStatus = nextCount >= Number(link.max_registrations) ? 'exhausted' : 'active';
      await client.query(`UPDATE public.registration_links SET registration_count=$1,status=$2,updated_at=now() WHERE link_id=$3`, [nextCount, nextStatus, link.link_id]);
      await audit(client, { actorUserId: link.requested_by, targetUserId: created.rows[0].u_id, linkId: link.link_id, action: 'account_registered_via_link', details: { accountType: Number(link.account_type), registrationCount: nextCount } });
      await client.query('COMMIT');
      emitRegistrationUpdate(req, link.requester_public_id);
      res.status(201).json({ message: 'Your account has been created. You can now sign in.', userId: created.rows[0].public_id });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Unable to register through link:', error);
      if (error.code === '23505') return res.status(409).json({ error: 'That username, email, or faculty ID is already registered.' });
      if (error.code === '23514') return res.status(400).json({ error: 'Use an official university email ending in @g.batstate-u.edu.ph.' });
      res.status(500).json({ error: 'Unable to create the account.' });
    } finally { client.release(); }
  });
};

module.exports.buildRegistrationToken = buildRegistrationToken;
module.exports.parseRegistrationToken = parseRegistrationToken;
module.exports.refreshTerminalStatuses = refreshTerminalStatuses;
