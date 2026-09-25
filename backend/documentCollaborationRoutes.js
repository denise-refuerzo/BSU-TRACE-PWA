const { randomUUID } = require('node:crypto');

const fail = (status, message) => Object.assign(new Error(message), { status });

const documentListSql = accessPredicate => `
  SELECT DISTINCT ON (idoc.ini_id)
    idoc.public_id AS ini_id,idoc.title,idoc.edc,idoc.qr_code,idoc.created_at,
    idoc.lifecycle_state,idoc.cancelled_at,idoc.cancellation_reason,
    pt.process_name,creator.full_name AS submitted_by,
    curr_o.office_name AS current_office,next_o.office_name AS next_office,
    CASE WHEN idoc.lifecycle_state='cancelled' THEN 'Cancelled'
      ELSE INITCAP(COALESCE(st.current_status,'pending')) END AS status,
    archive.archived_at,
    EXISTS (SELECT 1 FROM public.document_collaborators mine
      WHERE mine.ini_id=idoc.ini_id AND mine.user_id=$1) AS is_collaborator
  FROM public.initial_document idoc
  JOIN public.process_type pt ON pt.p_id=idoc.p_id
  JOIN public."User" creator ON creator.u_id=idoc.u_id
  LEFT JOIN LATERAL (SELECT pd.* FROM public.processed_document pd WHERE pd.ini_id=idoc.ini_id
    ORDER BY CASE WHEN pd.time_out IS NULL THEN 0 ELSE 1 END,pd.pd_id DESC LIMIT 1) current_step ON TRUE
  LEFT JOIN public.status st ON st.s_id=current_step.s_id
  LEFT JOIN public.offices curr_o ON curr_o.o_id=current_step.current_office_id
  LEFT JOIN public.offices next_o ON next_o.o_id=current_step.next_office_id
  LEFT JOIN public.document_user_archives archive ON archive.ini_id=idoc.ini_id AND archive.user_id=$1
  WHERE ${accessPredicate}`;

module.exports = function registerDocumentCollaborationRoutes(app, pool, requireAuth) {
  const transaction = handler => async (req, res) => {
    let db;
    const afterCommit = [];
    try {
      db = await pool.connect();
      await db.query('BEGIN');
      req.afterCollaborationCommit = callback => afterCommit.push(callback);
      const payload = await handler(db, req);
      await db.query('COMMIT');
      afterCommit.forEach(callback => callback());
      res.status(payload.created ? 201 : 200).json(payload);
    } catch (error) {
      if (db) await db.query('ROLLBACK');
      if (!error.status) console.error('Document collaboration:', error);
      res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to update document access.' });
    } finally {
      db?.release();
    }
  };

  const accessibleDocument = async (db, publicId, userId, { ownerOnly = false, lock = false } = {}) => {
    const result = await db.query(`SELECT idoc.*,(idoc.u_id=$2) AS is_owner,
      EXISTS (SELECT 1 FROM public.document_collaborators dc WHERE dc.ini_id=idoc.ini_id AND dc.user_id=$2) AS is_collaborator
      FROM public.initial_document idoc WHERE idoc.public_id=$1
      ${ownerOnly ? 'AND idoc.u_id=$2' : `AND (idoc.u_id=$2 OR EXISTS
        (SELECT 1 FROM public.document_collaborators dc WHERE dc.ini_id=idoc.ini_id AND dc.user_id=$2))`}
      ${lock ? 'FOR UPDATE OF idoc' : ''}`, [publicId, userId]);
    if (!result.rows[0]) throw fail(404, ownerOnly ? 'Only the original submitter can perform this action.' : 'Document not found.');
    return result.rows[0];
  };

  const activity = (db, iniId, actorId, type, details = {}) => db.query(
    `INSERT INTO public.document_activity_history(public_id,ini_id,actor_user_id,activity_type,details)
     VALUES($1,$2,$3,$4,$5::jsonb)`, [randomUUID(), iniId, actorId, type, JSON.stringify(details)]);

  app.get('/api/collaboration/candidates', requireAuth, async (req, res) => {
    try {
      const search = String(req.query.search || '').trim();
      if (search.length < 2) return res.json([]);
      const result = await pool.query(`SELECT public_id AS user_id,full_name,uni_email
        FROM public."User" WHERE is_active IS TRUE AND u_id<>$1 AND a_id<>5
          AND (full_name ILIKE $2 OR uni_email ILIKE $2)
        ORDER BY full_name LIMIT 20`, [req.user.u_id, `%${search}%`]);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to search university accounts.' });
    }
  });

  app.get('/api/collaboration/documents/:iniId/candidates', requireAuth, async (req, res) => {
    try {
      const doc = await accessibleDocument(pool, req.params.iniId, req.user.u_id, { ownerOnly: true });
      const owner = (await pool.query(`SELECT u.o_id,u.d_id,o.office_name,d.department_name
        FROM public."User" u
        LEFT JOIN public.offices o ON o.o_id=u.o_id
        LEFT JOIN public.department d ON d.d_id=u.d_id
        WHERE u.u_id=$1`, [req.user.u_id])).rows[0];
      const scopes = [];
      if (owner?.o_id) scopes.push({ id: 'office', label: owner.office_name || 'My office' });
      if (owner?.d_id) scopes.push({ id: 'department', label: owner.department_name || 'My department' });
      const scope = String(req.query.scope || 'search');
      const search = String(req.query.search || '').trim();
      if (scope === 'context') return res.json({ isOfficeSubmission: Boolean(doc.submission_office_id), scopes, candidates: [] });
      if (!['search', 'office', 'department'].includes(scope)) return res.status(400).json({ error: 'Unknown collaborator scope.' });
      if (scope === 'search' && search.length < 2) return res.json({ isOfficeSubmission: Boolean(doc.submission_office_id), scopes, candidates: [] });
      if (scope === 'office' && !owner?.o_id) return res.json({ isOfficeSubmission: Boolean(doc.submission_office_id), scopes, candidates: [] });
      if (scope === 'department' && !owner?.d_id) return res.json({ isOfficeSubmission: Boolean(doc.submission_office_id), scopes, candidates: [] });
      const scopeSql = scope === 'office' ? 'u.o_id=$2' : scope === 'department' ? 'u.d_id=$2' : '(u.full_name ILIKE $2 OR u.uni_email ILIKE $2)';
      const scopeValue = scope === 'office' ? owner.o_id : scope === 'department' ? owner.d_id : `%${search}%`;
      const result = await pool.query(`SELECT u.public_id AS user_id,u.full_name,u.uni_email,
          o.office_name,d.department_name
        FROM public."User" u
        LEFT JOIN public.offices o ON o.o_id=u.o_id
        LEFT JOIN public.department d ON d.d_id=u.d_id
        WHERE u.is_active IS TRUE AND u.u_id<>$1 AND u.a_id<>5 AND ${scopeSql}
          AND NOT EXISTS (SELECT 1 FROM public.document_collaborators dc WHERE dc.ini_id=$3 AND dc.user_id=u.u_id)
        ORDER BY u.full_name LIMIT 100`, [req.user.u_id, scopeValue, doc.ini_id]);
      res.json({ isOfficeSubmission: Boolean(doc.submission_office_id), scopes, candidates: result.rows });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to load collaborator suggestions.' });
    }
  });

  app.get('/api/collaboration/shared', requireAuth, async (req, res) => {
    try {
      const result = await pool.query(`${documentListSql(`EXISTS (SELECT 1 FROM public.document_collaborators dc
        WHERE dc.ini_id=idoc.ini_id AND dc.user_id=$1) AND archive.archive_id IS NULL`)}
        ORDER BY idoc.ini_id DESC`, [req.user.u_id]);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load shared submissions.' });
    }
  });

  app.get('/api/collaboration/archived', requireAuth, async (req, res) => {
    try {
      const result = await pool.query(`${documentListSql(`archive.archive_id IS NOT NULL AND
        (idoc.u_id=$1 OR EXISTS (SELECT 1 FROM public.document_collaborators dc WHERE dc.ini_id=idoc.ini_id AND dc.user_id=$1))`)}
        ORDER BY idoc.ini_id DESC`, [req.user.u_id]);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load archived submissions.' });
    }
  });

  app.get('/api/collaboration/history', requireAuth, async (req, res) => {
    try {
      const result = await pool.query(`
        WITH accessible AS (SELECT ini_id FROM public.initial_document WHERE u_id=$1
          UNION SELECT ini_id FROM public.document_collaborators WHERE user_id=$1), events AS (
          SELECT h.public_id::text AS event_id,'office_action'::text AS event_source,h.ini_id,h.u_id AS actor_id,h.action_type AS activity_type,
            '{}'::jsonb AS details,CASE WHEN h.legacy_manila_wall_time THEN h.action_timestamp-INTERVAL '8 hours' ELSE h.action_timestamp END AS occurred_at,
            CASE WHEN h.o_id=$2::integer THEN 'office' ELSE 'submission' END::text AS event_category
          FROM public.office_action_history h
          WHERE h.o_id=$2::integer OR EXISTS (SELECT 1 FROM accessible a WHERE a.ini_id=h.ini_id)
          UNION ALL
          SELECT dah.public_id::text,'document_activity',dah.ini_id,dah.actor_user_id,dah.activity_type,dah.details,dah.created_at,
            CASE WHEN dah.activity_type ILIKE '%collaborator%' OR dah.activity_type ILIKE '%archive%'
              THEN 'access' ELSE 'submission' END
          FROM public.document_activity_history dah JOIN accessible a USING(ini_id)
          UNION ALL
          SELECT cm.public_id::text,'chat_message',cr.ini_id,cm.sender_id,'Chat message sent',
            jsonb_build_object('office',o.office_name),cm.sent_at AT TIME ZONE 'Asia/Manila','chat'
          FROM public.chat_messages cm JOIN public.chat_rooms cr USING(room_id)
          JOIN public.offices o ON o.o_id=cr.o_id
          WHERE cr.o_id=$2::integer OR EXISTS (SELECT 1 FROM accessible a WHERE a.ini_id=cr.ini_id)
        )
        SELECT e.event_id,e.event_source,e.event_category,idoc.public_id AS ini_id,idoc.title,idoc.qr_code,e.activity_type,e.details,e.occurred_at,
          COALESCE(actor.full_name,'System') AS actor_name,(idoc.u_id=$1) AS is_owner,
          CASE WHEN idoc.u_id=$1 THEN 'Submitter'
            WHEN EXISTS (SELECT 1 FROM public.document_collaborators mine WHERE mine.ini_id=idoc.ini_id AND mine.user_id=$1) THEN 'Collaborator'
            ELSE 'Processing Office' END AS relationship_label
        FROM events e JOIN public.initial_document idoc ON idoc.ini_id=e.ini_id
        LEFT JOIN public."User" actor ON actor.u_id=e.actor_id
        ORDER BY e.occurred_at DESC LIMIT 500`, [req.user.u_id, req.user.o_id || null]);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to load submission history.' });
    }
  });

  app.get('/api/collaboration/documents/:iniId/collaborators', requireAuth, async (req, res) => {
    try {
      const doc = await accessibleDocument(pool, req.params.iniId, req.user.u_id);
      const result = await pool.query(`SELECT u.public_id AS user_id,u.full_name,u.uni_email,dc.created_at
        FROM public.document_collaborators dc JOIN public."User" u ON u.u_id=dc.user_id
        WHERE dc.ini_id=$1 ORDER BY u.full_name`, [doc.ini_id]);
      res.json({ isOwner: doc.is_owner, collaborators: result.rows });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to load collaborators.' });
    }
  });

  app.post('/api/collaboration/documents/:iniId/collaborators', requireAuth, transaction(async (db, req) => {
    const doc = await accessibleDocument(db, req.params.iniId, req.user.u_id, { ownerOnly: true, lock: true });
    const requestedIds = [...new Set((Array.isArray(req.body.userIds) ? req.body.userIds : [req.body.userId]).filter(Boolean).map(String))];
    if (!requestedIds.length || requestedIds.length > 50) throw fail(400, 'Select between 1 and 50 university accounts.');
    const candidates = (await db.query(`SELECT u_id,public_id,full_name FROM public."User"
      WHERE public_id::text=ANY($1::text[]) AND is_active IS TRUE AND a_id<>5 AND u_id<>$2
      ORDER BY full_name`, [requestedIds, req.user.u_id])).rows;
    if (candidates.length !== requestedIds.length) throw fail(400, 'One or more selected accounts are no longer eligible.');
    const inserted = await db.query(`INSERT INTO public.document_collaborators(ini_id,user_id,added_by)
      SELECT $1,candidate_id,$2 FROM unnest($3::integer[]) AS candidate(candidate_id)
      ON CONFLICT(ini_id,user_id) DO NOTHING RETURNING user_id`,
      [doc.ini_id, req.user.u_id, candidates.map(candidate => candidate.u_id)]);
    const insertedIds = new Set(inserted.rows.map(row => Number(row.user_id)));
    const added = candidates.filter(candidate => insertedIds.has(Number(candidate.u_id)));
    if (!added.length) throw fail(409, 'The selected accounts already have access.');
    for (const candidate of added) await activity(db, doc.ini_id, req.user.u_id, 'Collaborator added', { collaboratorName: candidate.full_name });
    req.afterCollaborationCommit(() => {
      const io = req.app.get('io');
      added.forEach(candidate => {
        io?.to(`user_${candidate.public_id}`).emit('document-updated');
        io?.to(`user_${candidate.public_id}`).emit('collaboration-updated', { iniId: doc.public_id });
      });
      io?.to(`user_${req.user.public_id}`).emit('document-updated');
      io?.to(`user_${req.user.public_id}`).emit('collaboration-updated', { iniId: doc.public_id });
    });
    return { created: true, added: added.map(candidate => ({ userId: candidate.public_id, name: candidate.full_name })), message: `${added.length} collaborator${added.length === 1 ? '' : 's'} added.` };
  }));

  app.delete('/api/collaboration/documents/:iniId/collaborators/:userId', requireAuth, transaction(async (db, req) => {
    const doc = await accessibleDocument(db, req.params.iniId, req.user.u_id, { ownerOnly: true, lock: true });
    const removed = await db.query(`DELETE FROM public.document_collaborators dc USING public."User" u
      WHERE dc.ini_id=$1 AND dc.user_id=u.u_id AND u.public_id=$2 RETURNING u.full_name`, [doc.ini_id, req.params.userId]);
    if (!removed.rowCount) throw fail(404, 'Collaborator not found.');
    await activity(db, doc.ini_id, req.user.u_id, 'Collaborator removed', { collaboratorName: removed.rows[0].full_name });
    req.afterCollaborationCommit(() => {
      const io = req.app.get('io');
      io?.to(`user_${req.params.userId}`).emit('document-updated');
      io?.to(`user_${req.params.userId}`).emit('collaboration-updated', { iniId: doc.public_id });
      io?.to(`user_${req.user.public_id}`).emit('document-updated');
      io?.to(`user_${req.user.public_id}`).emit('collaboration-updated', { iniId: doc.public_id });
    });
    return { message: 'Collaborator access removed.' };
  }));

  app.post('/api/collaboration/documents/:iniId/cancel', requireAuth, transaction(async (db, req) => {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 5 || reason.length > 500) throw fail(400, 'Enter a cancellation reason between 5 and 500 characters.');
    const doc = await accessibleDocument(db, req.params.iniId, req.user.u_id, { ownerOnly: true, lock: true });
    if (doc.lifecycle_state === 'cancelled') throw fail(409, 'This submission is already cancelled.');
    const latest = (await db.query(`SELECT * FROM public.processed_document WHERE ini_id=$1 ORDER BY pd_id DESC LIMIT 1 FOR UPDATE`, [doc.ini_id])).rows[0];
    if (Number(latest?.s_id) === 5) throw fail(409, 'Completed submissions cannot be stopped. Archive the submission instead.');
    await db.query(`UPDATE public.initial_document SET lifecycle_state='cancelled',cancelled_at=NOW(),cancelled_by=$2,cancellation_reason=$3 WHERE ini_id=$1`,
      [doc.ini_id, req.user.u_id, reason]);
    await db.query(`UPDATE public.processed_document SET time_out=COALESCE(time_out,TIMEZONE('Asia/Manila',NOW()))
      WHERE ini_id=$1 AND time_out IS NULL`, [doc.ini_id]);
    await activity(db, doc.ini_id, req.user.u_id, 'Processing stopped by submitter', { reason });
    const offices = new Set([latest?.current_office_id, latest?.next_office_id].filter(Boolean));
    req.afterCollaborationCommit(() => {
      const io = req.app.get('io');
      for (const officeId of offices) io?.to(`office_${officeId}`).emit('pipeline-updated');
      io?.to(`user_${req.user.public_id}`).emit('document-updated');
      io?.to('gso_admin_room').emit('system-metrics-updated');
    });
    return { message: 'Processing stopped. The submission remains in history and may now be archived.' };
  }));

  app.post('/api/collaboration/documents/:iniId/archive', requireAuth, transaction(async (db, req) => {
    const doc = await accessibleDocument(db, req.params.iniId, req.user.u_id, { lock: true });
    const latest = (await db.query(`SELECT s_id FROM public.processed_document WHERE ini_id=$1 ORDER BY pd_id DESC LIMIT 1`, [doc.ini_id])).rows[0];
    if (doc.lifecycle_state !== 'cancelled' && ![4, 5].includes(Number(latest?.s_id)))
      throw fail(409, 'Only completed, action-required, or cancelled submissions can be archived.');
    await db.query(`INSERT INTO public.document_user_archives(ini_id,user_id) VALUES($1,$2)
      ON CONFLICT(ini_id,user_id) DO UPDATE SET archived_at=NOW()`, [doc.ini_id, req.user.u_id]);
    await activity(db, doc.ini_id, req.user.u_id, 'Submission archived');
    req.afterCollaborationCommit(() => req.app.get('io')?.to(`user_${req.user.public_id}`).emit('document-updated'));
    return { message: 'Submission moved to your archive.' };
  }));

  app.delete('/api/collaboration/documents/:iniId/archive', requireAuth, transaction(async (db, req) => {
    const doc = await accessibleDocument(db, req.params.iniId, req.user.u_id);
    await db.query('DELETE FROM public.document_user_archives WHERE ini_id=$1 AND user_id=$2', [doc.ini_id, req.user.u_id]);
    await activity(db, doc.ini_id, req.user.u_id, 'Submission restored from archive');
    req.afterCollaborationCommit(() => req.app.get('io')?.to(`user_${req.user.public_id}`).emit('document-updated'));
    return { message: 'Submission restored to its regular list.' };
  }));
};
