const {fail, isOffice, resolveRoute, assertAction} = require('./officeWorkflow');
const crypto = require('node:crypto');

module.exports = function registerOfficeWorkflow(app, pool, requireAuth) {
  app.get('/api/office/documents/:iniId', requireAuth, async (req,res) => {
    try {
      const doc=(await pool.query(`SELECT i.*,p.process_name,u.full_name AS submitted_by
        FROM public.initial_document i JOIN public.process_type p USING(p_id)
        JOIN public."User" u ON i.u_id=u.u_id WHERE ini_id=$1`,[req.params.iniId])).rows[0];
      if (!doc) return res.status(404).json({error:'Document not found.'});
      const steps=(await pool.query(`SELECT pd.*,o.office_name,s.current_status,n.office_name AS next_office_name FROM public.processed_document pd
        JOIN public.offices o ON pd.current_office_id=o.o_id JOIN public.status s USING(s_id)
        LEFT JOIN public.offices n ON pd.next_office_id=n.o_id WHERE ini_id=$1 ORDER BY pd_id`,[doc.ini_id])).rows;
      if (!(Number(doc.u_id)===Number(req.user.u_id) || (isOffice(req.user) &&
        (Number(doc.submission_office_id)===Number(req.user.o_id) || steps.some(s=>Number(s.current_office_id)===Number(req.user.o_id))))))
        return res.status(403).json({error:'This document is not assigned to your office.'});
      const actions=(await pool.query(`SELECT h.history_id,h.action_type,u.full_name,o.office_name,
        CASE WHEN h.legacy_manila_wall_time THEN h.action_timestamp-INTERVAL '8 hours' ELSE h.action_timestamp END AS action_timestamp
        FROM public.office_action_history h JOIN public."User" u USING(u_id) JOIN public.offices o ON h.o_id=o.o_id
        WHERE h.ini_id=$1 ORDER BY h.history_id`,[doc.ini_id])).rows;
      const route=(await pool.query(`SELECT o.office_name FROM unnest($1::integer[]) WITH ORDINALITY AS r(o_id,position)
        JOIN public.offices o ON r.o_id=o.o_id ORDER BY r.position`,[doc.route_snapshot])).rows;
      res.json({...doc,steps,actions,route_names:route.map(o=>o.office_name)});
    } catch(err) {console.error(err);res.status(500).json({error:'Unable to load document details.'});}
  });
  const transaction = handler => async (req, res) => {
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const result = await client.query('SELECT u_id,a_id,o_id,d_id FROM public."User" WHERE u_id=$1 AND is_active IS TRUE', [req.user.u_id]);
      if (!result.rows[0]) throw fail(403, 'An active account is required.');
      const payload = await handler(client, result.rows[0], req);
      await client.query('COMMIT');
      res.status(payload.created ? 201 : 200).json(payload);
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      if (!err.status) console.error('Office workflow:', err);
      res.status(err.status || 500).json({error: err.status ? err.message : 'Unable to save the document. Please try again.'});
    } finally { client?.release(); }
  };
  const audit = (db, doc, user, action, office = user.o_id) => db.query(
    `INSERT INTO public.office_action_history (ini_id,u_id,o_id,action_type,action_timestamp)
     VALUES ($1,$2,$3,$4,NOW())`, [doc, user.u_id, office, action]);
  const lockDoc = async (db, req) => {
    const result = await db.query(`SELECT * FROM public.initial_document
      WHERE ${req.body.qrCode ? 'qr_code' : 'ini_id'}=$1 FOR UPDATE`, [req.body.qrCode || req.body.iniId]);
    if (!result.rows[0]) throw fail(404, 'Document not found.');
    return result.rows[0];
  };
  const activeStep = async (db, id) => (await db.query(`SELECT * FROM public.processed_document
    WHERE ini_id=$1 AND time_out IS NULL ORDER BY pd_id DESC LIMIT 1 FOR UPDATE`, [id])).rows[0];
  const insertStep = (db, id, office, next) => db.query(`INSERT INTO public.processed_document
    (ini_id,s_id,current_office_id,next_office_id) VALUES ($1,1,$2,$3)`, [id, office, next || null]);

  app.post('/api/documents', requireAuth, transaction(async (db, user, req) => {
    const {title, processTypeId, edc, completeOriginProcessing = false} = req.body;
    if (![1,2,3,4].includes(Number(user.a_id))) throw fail(403, 'This account cannot submit documents.');
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 150) throw fail(400, 'Enter a document title of up to 150 characters.');
    if (!Number.isInteger(processTypeId) || typeof completeOriginProcessing !== 'boolean') throw fail(400, 'Select a valid pipeline and processing option.');
    const route = (await db.query(`SELECT r.* FROM public.process_type p JOIN public.route r ON p.r_id=r.r_id
      WHERE p.p_id=$1 AND p.is_active IS TRUE FOR SHARE OF p,r`, [processTypeId])).rows[0];
    if (!route) throw fail(400, 'Select an active pipeline.');
    const sequence = resolveRoute(route, user);
    if (!sequence.length) throw fail(400, 'This pipeline has no office stops.');
    if (completeOriginProcessing && (!isOffice(user) || Number(user.o_id) !== sequence[0]))
      throw fail(403, 'Only staff of the pipeline’s originating office may complete its processing upon submission.');
    const qrCode = `TRK-${crypto.randomUUID()}`;
    const doc = (await db.query(`INSERT INTO public.initial_document
      (p_id,u_id,title,edc,qr_code,created_at,submission_office_id,route_snapshot)
      VALUES ($1,$2,$3,$4,$5,TIMEZONE('Asia/Manila',NOW()),$6,$7) RETURNING *`,
    [processTypeId,user.u_id,title.trim(),edc || null,qrCode,isOffice(user) ? user.o_id : null,sequence])).rows[0];
    await insertStep(db, doc.ini_id, sequence[0], sequence[1]);
    await audit(db, doc.ini_id, user, 'Submitted', isOffice(user) ? user.o_id : sequence[0]);
    if (completeOriginProcessing) {
      await db.query(`UPDATE public.processed_document SET time_in=TIMEZONE('Asia/Manila',NOW()),
        time_out=TIMEZONE('Asia/Manila',NOW()),s_id=$2 WHERE ini_id=$1`, [doc.ini_id,sequence.length > 1 ? 3 : 5]);
      for (const action of ['Scanned In','Approved & Signed','Scanned Out'])
        await audit(db, doc.ini_id, user, `${action} (upon submission)`);
      if (sequence[1]) await insertStep(db, doc.ini_id, sequence[1], sequence[2]);
    }
    return {created:true, message:'Document submitted.',qrCode,iniId:doc.ini_id};
  }));

  for (const [action, paths] of Object.entries({
    'time-in':['/api/documents/scan-in'], 'time-out':['/api/documents/scan-out'],
    sign:['/api/office/sign','/api/signee/sign'], return:['/api/office/return','/api/signee/return'],
    adhoc:['/api/processor/documents/ad-hoc']
  })) {
    for (const path of paths) app.post(path, requireAuth, transaction(async (db,user,req) => {
      const doc = await lockDoc(db, req);
      const latest = (await db.query('SELECT s_id,time_out FROM public.processed_document WHERE ini_id=$1 ORDER BY pd_id DESC LIMIT 1', [doc.ini_id])).rows[0];
      if (latest?.s_id === 4 && latest.time_out) throw fail(409,'This document is awaiting correction and resubmission.');
      const step = await activeStep(db, doc.ini_id);
      assertAction(step,user,action);
      let message;
      if (action === 'time-in') {
        await db.query(`UPDATE public.processed_document SET time_in=TIMEZONE('Asia/Manila',NOW()) WHERE pd_id=$1`, [step.pd_id]);
        await audit(db,doc.ini_id,user,'Scanned In');
        message = 'Time In recorded. The document is ready for review and signing.';
      } else if (action === 'sign') {
        await db.query('UPDATE public.processed_document SET s_id=3 WHERE pd_id=$1', [step.pd_id]);
        await audit(db,doc.ini_id,user,'Approved & Signed');
        message = 'Signature recorded under your account. The document is ready for Time Out.';
      } else if (action === 'return') {
        const reason = req.body.reason?.trim();
        if (!reason || reason.length > 75) throw fail(400,'Enter a correction reason of up to 75 characters.');
        await db.query('UPDATE public.processed_document SET s_id=4 WHERE pd_id=$1', [step.pd_id]);
        await audit(db,doc.ini_id,user,`Sent Back for Revision: ${reason}`);
        message = 'Correction reason recorded. Record Time Out when releasing the document for revision.';
      } else if (action === 'adhoc') {
        const target = Number(req.body.targetOfficeId);
        const office = (await db.query('SELECT o_id FROM public.offices WHERE o_id=$1 AND o_id<>999', [target])).rows[0];
        if (!office || target === Number(user.o_id)) throw fail(400,'Select another office.');
        const pending = await db.query('SELECT pd_id FROM public.processed_document WHERE ini_id=$1 AND current_office_id=$2 AND time_out IS NULL', [doc.ini_id,target]);
        if (pending.rows.length) throw fail(409,'That office already has an unfinished step for this document.');
        await db.query('UPDATE public.processed_document SET s_id=2 WHERE pd_id=$1', [step.pd_id]);
        await db.query(`INSERT INTO public.processed_document
          (ini_id,s_id,current_office_id,is_adhoc,adhoc_return_office_id,next_office_id)
          VALUES ($1,1,$2,true,$3,$3)`, [doc.ini_id,target,user.o_id]);
        await audit(db,doc.ini_id,user,'Ad-Hoc Detour Routed');
        message = 'Document routed for verification. It will return to your office to finish processing.';
      } else {
        await db.query(`UPDATE public.processed_document SET time_out=TIMEZONE('Asia/Manila',NOW()) WHERE pd_id=$1`, [step.pd_id]);
        if (step.s_id === 4) {
          await audit(db,doc.ini_id,user,'Scanned Out (Halted - Revision Required)');
          message = 'Released for correction. The submitting office or originator can now resubmit.';
        } else if (step.is_adhoc) {
          await db.query(`UPDATE public.processed_document SET s_id=1 WHERE pd_id=(SELECT pd_id
            FROM public.processed_document WHERE ini_id=$1 AND current_office_id=$2 AND time_out IS NULL
            ORDER BY pd_id DESC LIMIT 1)`, [doc.ini_id,step.adhoc_return_office_id]);
          await audit(db,doc.ini_id,user,'Scanned Out');
          message = 'Verification completed. The document has returned to the requesting office.';
        } else {
          const sequence = doc.route_snapshot;
          if (!sequence?.length) throw fail(409,'This document needs its route migration before it can advance.');
          const count = (await db.query(`SELECT COUNT(*)::int AS n FROM public.processed_document
            WHERE ini_id=$1 AND is_adhoc IS NOT TRUE AND time_out IS NOT NULL AND s_id IN (3,5)`, [doc.ini_id])).rows[0].n;
          if (sequence[count]) await insertStep(db,doc.ini_id,sequence[count],sequence[count+1]);
          else await db.query('UPDATE public.processed_document SET s_id=5 WHERE pd_id=$1', [step.pd_id]);
          await audit(db,doc.ini_id,user,'Scanned Out');
          message = sequence[count] ? 'Released. The next office can now record Time In.' : 'Document processing completed.';
        }
      }
      return {message};
    }));
  }

  app.post('/api/documents/:iniId/resubmit', requireAuth, transaction(async (db,user,req) => {
    req.body.iniId = Number(req.params.iniId);
    const doc = await lockDoc(db,req);
    if (!(Number(doc.u_id) === Number(user.u_id) || (isOffice(user) && Number(doc.submission_office_id) === Number(user.o_id))))
      throw fail(403,'Only the submitter or submitting office can resubmit this document.');
    const step = (await db.query('SELECT * FROM public.processed_document WHERE ini_id=$1 ORDER BY pd_id DESC LIMIT 1 FOR UPDATE', [doc.ini_id])).rows[0];
    if (step?.s_id !== 4 || !step.time_out) throw fail(409,'Wait until the returning office has released the document for correction.');
    const title = req.body.title?.trim();
    if (!title || title.length > 150) throw fail(400,'Enter a title of up to 150 characters.');
    await db.query('UPDATE public.initial_document SET title=$2 WHERE ini_id=$1', [doc.ini_id,title]);
    await db.query(`INSERT INTO public.processed_document
      (ini_id,s_id,current_office_id,next_office_id,is_adhoc,adhoc_return_office_id)
      VALUES ($1,1,$2,$3,$4,$5)`, [doc.ini_id,step.current_office_id,step.next_office_id,step.is_adhoc,step.adhoc_return_office_id]);
    await audit(db,doc.ini_id,user,'Resubmitted after correction',user.o_id || step.current_office_id);
    return {message:'Resubmitted to the office that requested corrections.'};
  }));
};
