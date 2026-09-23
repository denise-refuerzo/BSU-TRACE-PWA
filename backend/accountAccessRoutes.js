const activeAssignmentSql = `
  aa.is_active IS TRUE
  AND (aa.starts_on IS NULL OR aa.starts_on <= CURRENT_DATE)
  AND (aa.ends_on IS NULL OR aa.ends_on >= CURRENT_DATE)
`;

async function getBookingSignatoryOptions(db, userId) {
  const requesterResult = await db.query(`
    SELECT u.u_id,u.public_id,u.full_name,u.o_id,o.office_name
    FROM public."User" u
    LEFT JOIN public.offices o ON o.o_id=u.o_id
    WHERE u.u_id=$1 AND u.is_active IS TRUE
  `, [userId]);
  const requester = requesterResult.rows[0];
  if (!requester) return null;

  const candidates = await db.query(`
    SELECT signer.u_id,signer.public_id,signer.full_name,aa.office_id,o.office_name,
           aa.can_recommend,aa.can_approve
    FROM public.account_access_assignments aa
    JOIN public."User" signer ON signer.u_id=aa.u_id AND signer.is_active IS TRUE
    JOIN public.offices o ON o.o_id=aa.office_id
    WHERE ${activeAssignmentSql}
      AND aa.scope_type='office' AND (aa.can_recommend IS TRUE OR aa.can_approve IS TRUE)
    ORDER BY o.office_name,signer.full_name,aa.assignment_id
  `);

  const officeMap = new Map();
  for (const row of candidates.rows) {
    const office = officeMap.get(Number(row.office_id)) || {
      officeId: Number(row.office_id), officeName: row.office_name, recommenders: [], approvers: []
    };
    const person = { userId: Number(row.u_id), publicId: row.public_id, name: row.full_name };
    if (row.can_recommend) office.recommenders.push(person);
    if (row.can_approve) office.approvers.push(person);
    officeMap.set(Number(row.office_id), office);
  }

  return {
    requestedBy: {
      userId: Number(requester.u_id),
      publicId: requester.public_id,
      name: requester.full_name,
      officeId: requester.o_id ? Number(requester.o_id) : null,
      officeName: requester.office_name || 'No office assigned'
    },
    offices: [...officeMap.values()]
  };
}

async function resolveBookingSignatories(db, requesterId, selection = {}) {
  const options = await getBookingSignatoryOptions(db, requesterId);
  if (!options) return null;
  const choose = (permission, officeIdValue, userIdValue) => {
    const officeId = Number(officeIdValue);
    const userId = Number(userIdValue);
    if (!Number.isInteger(officeId) || !Number.isInteger(userId)) return null;
    const office = options.offices.find(item => item.officeId === officeId);
    const person = office?.[permission].find(item => item.userId === userId);
    return person ? { ...person, officeId, officeName: office.officeName } : null;
  };
  return {
    requestedBy: options.requestedBy,
    recommendingApproval: choose('recommenders', selection.recommendingApprovalOfficeId, selection.recommendingApprovalUserId),
    approvedBy: choose('approvers', selection.approvedByOfficeId, selection.approvedByUserId)
  };
}

module.exports = function registerAccountAccessRoutes(app, pool, requireAuth) {
  const requireIct = (req, res) => {
    if (Number(req.user.a_id) !== 5) {
      res.status(403).json({ error: 'ICT Administrator access is required.' });
      return false;
    }
    return true;
  };

  app.get('/api/account-access/:userId', requireAuth, async (req, res) => {
    if (!requireIct(req, res)) return;
    try {
      const user = await pool.query('SELECT u_id FROM public."User" WHERE public_id=$1', [req.params.userId]);
      if (!user.rowCount) return res.status(404).json({ error: 'Staff account not found.' });
      const result = await pool.query(`
        SELECT aa.assignment_id,aa.scope_type,aa.office_id,aa.department_id,
               aa.can_view_submissions,aa.can_recommend,aa.can_approve,
               aa.position_title,aa.starts_on,aa.ends_on,aa.is_active,
               o.office_name,d.department_name
        FROM public.account_access_assignments aa
        LEFT JOIN public.offices o ON o.o_id=aa.office_id
        LEFT JOIN public.department d ON d.d_id=aa.department_id
        WHERE aa.u_id=$1
        ORDER BY aa.scope_type,COALESCE(o.office_name,d.department_name)
      `, [user.rows[0].u_id]);
      res.json(result.rows);
    } catch (error) {
      console.error('Unable to load approval and submission access:', error);
      res.status(500).json({ error: 'Unable to load approval and submission access.' });
    }
  });

  app.put('/api/account-access/:userId', requireAuth, async (req, res) => {
    if (!requireIct(req, res)) return;
    const assignments = Array.isArray(req.body.assignments) ? req.body.assignments : null;
    if (!assignments) return res.status(400).json({ error: 'Provide a valid list of access assignments.' });

    const cleaned = [];
    const seen = new Set();
    for (const item of assignments) {
      const scopeType = item.scopeType === 'department' ? 'department' : item.scopeType === 'office' ? 'office' : null;
      const targetId = Number(scopeType === 'office' ? item.officeId : item.departmentId);
      const canView = Boolean(item.canViewSubmissions);
      const canRecommend = Boolean(item.canRecommend);
      const canApprove = Boolean(item.canApprove);
      const positionTitle = typeof item.positionTitle === 'string' ? item.positionTitle.trim() : '';
      const startsOn = item.startsOn || null;
      const endsOn = item.endsOn || null;
      const key = `${scopeType}:${targetId}`;
      if (!scopeType || !Number.isInteger(targetId) || targetId < 1 || (!canView && !canRecommend && !canApprove)) {
        return res.status(400).json({ error: 'Each assignment needs an office or department and at least one responsibility.' });
      }
      if (seen.has(key)) return res.status(400).json({ error: 'The same office or department can only be added once for a staff member.' });
      if (startsOn && endsOn && startsOn > endsOn) return res.status(400).json({ error: 'The end date cannot be earlier than the start date.' });
      seen.add(key);
      cleaned.push({ scopeType, targetId, canView, canRecommend, canApprove, positionTitle, startsOn, endsOn, isActive: item.isActive !== false });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const user = await client.query('SELECT u_id,public_id FROM public."User" WHERE public_id=$1 FOR UPDATE', [req.params.userId]);
      if (!user.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Staff account not found.' });
      }
      await client.query('DELETE FROM public.account_access_assignments WHERE u_id=$1', [user.rows[0].u_id]);
      for (const item of cleaned) {
        await client.query(`
          INSERT INTO public.account_access_assignments
            (u_id,scope_type,office_id,department_id,can_view_submissions,can_recommend,can_approve,position_title,starts_on,ends_on,is_active)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [user.rows[0].u_id, item.scopeType, item.scopeType === 'office' ? item.targetId : null,
          item.scopeType === 'department' ? item.targetId : null, item.canView, item.canRecommend,
          item.canApprove, item.positionTitle || null, item.startsOn, item.endsOn, item.isActive]);
      }
      await client.query('COMMIT');
      const io = req.app.get('io');
      io?.to(`user_${user.rows[0].public_id}`).emit('account-access-updated');
      io?.to('ict_admin_room').emit('admin-configuration-updated');
      res.json({ message: 'Approval and submission access saved.' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Unable to save approval and submission access:', error);
      if (error.code === '23505') return res.status(409).json({ error: 'That office or department already has someone assigned to this approval responsibility.' });
      res.status(500).json({ error: 'Unable to save approval and submission access.' });
    } finally {
      client.release();
    }
  });

  app.get('/api/account-access/me/summary', requireAuth, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT aa.scope_type,aa.office_id,aa.department_id,aa.can_view_submissions,
               aa.can_recommend,aa.can_approve,aa.position_title,o.office_name,d.department_name
        FROM public.account_access_assignments aa
        LEFT JOIN public.offices o ON o.o_id=aa.office_id
        LEFT JOIN public.department d ON d.d_id=aa.department_id
        WHERE aa.u_id=$1 AND ${activeAssignmentSql}
        ORDER BY aa.scope_type,COALESCE(o.office_name,d.department_name)
      `, [req.user.u_id]);
      res.json({
        offices: result.rows.filter(row => row.scope_type === 'office'),
        departments: result.rows.filter(row => row.scope_type === 'department')
      });
    } catch (error) {
      console.error('Unable to load account access summary:', error);
      res.status(500).json({ error: 'Unable to load submission access.' });
    }
  });

  app.get('/api/account-access/me/booking-signatories', requireAuth, async (req, res) => {
    try {
      const options = await getBookingSignatoryOptions(pool, req.user.u_id);
      if (!options) return res.status(404).json({ error: 'Account not found.' });
      res.json(options);
    } catch (error) {
      console.error('Unable to resolve booking signatories:', error);
      res.status(500).json({ error: 'Unable to load the assigned approvers.' });
    }
  });

  app.get('/api/submission-overview', requireAuth, async (req, res) => {
    const scopeType = req.query.type;
    const targetId = Number(req.query.id);
    if (!['office', 'department'].includes(scopeType) || !Number.isInteger(targetId)) {
      return res.status(400).json({ error: 'Choose a valid office or department.' });
    }
    try {
      const allowed = await pool.query(`
        SELECT 1 FROM public.account_access_assignments aa
        WHERE aa.u_id=$1 AND aa.scope_type=$2 AND ${scopeType === 'office' ? 'aa.office_id' : 'aa.department_id'}=$3
          AND aa.can_view_submissions IS TRUE AND ${activeAssignmentSql}
      `, [req.user.u_id, scopeType, targetId]);
      if (!allowed.rowCount) return res.status(403).json({ error: 'You have not been assigned access to these submissions.' });

      const result = await pool.query(`
        SELECT i.public_id AS ini_id,i.title,i.created_at,i.edc,u.full_name AS submitted_by,
               o.office_name,d.department_name,p.process_name,
               COALESCE(latest.current_status,'Submitted') AS current_status,
               latest.current_office,latest.next_office
        FROM public.initial_document i
        JOIN public."User" u ON u.u_id=i.u_id
        LEFT JOIN public.offices o ON o.o_id=u.o_id
        LEFT JOIN public.department d ON d.d_id=u.d_id
        JOIN public.process_type p ON p.p_id=i.p_id
        LEFT JOIN LATERAL (
          SELECT s.current_status,current_office.office_name AS current_office,
                 next_office.office_name AS next_office
          FROM public.processed_document pd
          JOIN public.status s ON s.s_id=pd.s_id
          LEFT JOIN public.offices current_office ON current_office.o_id=pd.current_office_id
          LEFT JOIN public.offices next_office ON next_office.o_id=pd.next_office_id
          WHERE pd.ini_id=i.ini_id ORDER BY pd.pd_id DESC LIMIT 1
        ) latest ON true
        WHERE ${scopeType === 'office' ? 'u.o_id' : 'u.d_id'}=$1
        ORDER BY i.created_at DESC,i.ini_id DESC
      `, [targetId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Unable to load submission overview:', error);
      res.status(500).json({ error: 'Unable to load submissions right now.' });
    }
  });
};

module.exports.resolveBookingSignatories = resolveBookingSignatories;
module.exports.getBookingSignatoryOptions = getBookingSignatoryOptions;
module.exports.activeAssignmentSql = activeAssignmentSql;
