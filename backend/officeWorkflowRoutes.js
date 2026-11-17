const {fail, isOffice, resolveRoute, resolveTemplateRoute, assertAction} = require('./officeWorkflow');
const crypto = require('node:crypto');
const {routeProgress} = require('./routeProgress');
const {attachStepActors} = require('./officeActionAudit');

// --- NEW: WEBSOCKET BROADCASTER HELPER ---
const broadcastDocumentUpdate = async (req, db, originUserId, currentOfficeId, nextOfficeId, otherOfficeIds = []) => {
  const io = req.app?.get?.('io');
  if (!io) return;

  if (originUserId) {
    const result = await db.query('SELECT public_id,o_id,d_id FROM public."User" WHERE u_id=$1', [originUserId]);
    const originUser = result.rows[0];
    const publicUserId = originUser?.public_id;
    if (publicUserId) io.to(`user_${publicUserId}`).emit('document-updated');
    if (originUser?.o_id) io.to(`overview_office_${originUser.o_id}`).emit('submission-overview-updated');
    if (originUser?.d_id) io.to(`overview_department_${originUser.d_id}`).emit('submission-overview-updated');
  }
  for (const officeId of new Set([currentOfficeId, nextOfficeId, ...otherOfficeIds].filter(Boolean)))
    io.to(`office_${officeId}`).emit('pipeline-updated');

  // Trigger global metrics refresh for GSO & ICT Admins
  io.to('gso_admin_room').emit('system-metrics-updated');
  io.to('ict_admin_room').emit('system-metrics-updated');
};

module.exports = function registerOfficeWorkflow(app, pool, requireAuth) {
  app.get('/api/office/documents/:iniId', requireAuth, async (req,res) => {
    try {
      const doc=(await pool.query(`SELECT i.*,p.process_name,u.full_name AS submitted_by,
        requestor_office.office_name AS requestor_office_name
        FROM public.initial_document i JOIN public.process_type p USING(p_id)
        JOIN public."User" u ON i.u_id=u.u_id
        LEFT JOIN public.offices requestor_office ON u.o_id=requestor_office.o_id
        WHERE i.public_id=$1`,[req.params.iniId])).rows[0];
      if (!doc) return res.status(404).json({error:'Document not found.'});
      const steps=(await pool.query(`SELECT pd.*,pd.public_id AS external_id,o.office_name,s.current_status,n.office_name AS next_office_name FROM public.processed_document pd
        JOIN public.offices o ON pd.current_office_id=o.o_id JOIN public.status s USING(s_id)
        LEFT JOIN public.offices n ON pd.next_office_id=n.o_id WHERE ini_id=$1 ORDER BY pd_id`,[doc.ini_id])).rows;
      const collaborator=(await pool.query(`SELECT 1 FROM public.document_collaborators WHERE ini_id=$1 AND user_id=$2`,[doc.ini_id,req.user.u_id])).rowCount>0;
      if (!(Number(doc.u_id)===Number(req.user.u_id) || collaborator || (isOffice(req.user) &&
        (Number(doc.submission_office_id)===Number(req.user.o_id) || steps.some(s=>Number(s.current_office_id)===Number(req.user.o_id))))))
        return res.status(403).json({error:'This document is not assigned to your office.'});
      const actions=(await pool.query(`SELECT h.public_id AS history_id,h.o_id AS office_id,h.action_type,u.full_name,o.office_name,
        CASE WHEN h.legacy_manila_wall_time THEN h.action_timestamp-INTERVAL '8 hours' ELSE h.action_timestamp END AS action_timestamp
        FROM public.office_action_history h JOIN public."User" u USING(u_id) JOIN public.offices o ON h.o_id=o.o_id
        WHERE h.ini_id=$1 ORDER BY h.history_id`,[doc.ini_id])).rows;
      const route=(await pool.query(`SELECT o.office_name FROM unnest($1::integer[]) WITH ORDINALITY AS r(o_id,position)
        JOIN public.offices o ON r.o_id=o.o_id ORDER BY r.position`,[doc.route_snapshot])).rows;
      const {public_id, u_id, cancelled_by, ...publicDocument} = doc;
      const publicSteps = attachStepActors(steps, actions).map(step => {
        const legacyHalt = !step.is_adhoc && !step.time_out && steps.some(later =>
          Number(later.pd_id) > Number(step.pd_id) && later.is_adhoc && Number(later.s_id) === 4 &&
          Number(later.adhoc_return_office_id) === Number(step.current_office_id));
        const sanitized = {...step,pd_id:step.external_id,
          s_id:legacyHalt ? 4 : step.s_id,
          is_returned_from_adhoc:step.is_returned_from_adhoc || legacyHalt};
        delete sanitized.public_id;
        delete sanitized.external_id;
        return sanitized;
      });
      const publicActions = actions.map(({office_id, ...action}) => action);
      res.json({...publicDocument,ini_id:public_id,steps:publicSteps,route_steps:routeProgress(doc.route_snapshot || [],publicSteps).routeSteps,actions:publicActions,route_names:route.map(o=>o.office_name),
        permissions:{isOwner:Number(doc.u_id)===Number(req.user.u_id),isCollaborator:collaborator}});
    } catch(err) {console.error(err);res.status(500).json({error:'Unable to load document details.'});}
  });

  const transaction = handler => async (req, res) => {
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const result = await client.query('SELECT u_id,public_id,a_id,o_id,d_id FROM public."User" WHERE u_id=$1 AND is_active IS TRUE', [req.user.u_id]);
      if (!result.rows[0]) throw fail(403, 'An active account is required.');
      const payload = await handler(client, result.rows[0], req);
      await client.query('COMMIT');
      if (payload.broadcast) {
        const {originUserId,currentOfficeId,nextOfficeId,otherOfficeIds} = payload.broadcast;
        try { await broadcastDocumentUpdate(req,pool,originUserId,currentOfficeId,nextOfficeId,otherOfficeIds); }
        catch (error) { console.error('Document update broadcast:',error); }
      }
      if (payload.configurationChanged) req.app?.get?.('io')?.to('ict_admin_room').emit('admin-configuration-updated');
      const {broadcast,...response} = payload;
      res.status(payload.created ? 201 : 200).json(response);
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
      WHERE ${req.body.qrCode ? 'qr_code' : 'public_id'}=$1 FOR UPDATE`, [req.body.qrCode || req.body.iniId]);
    if (!result.rows[0]) throw fail(404, 'Document not found.');
    return result.rows[0];
  };

  const activeStep = async (db, id) => (await db.query(`SELECT * FROM public.processed_document
    WHERE ini_id=$1 AND time_out IS NULL AND NOT (is_returned_from_adhoc IS TRUE AND s_id=4)
    ORDER BY pd_id DESC LIMIT 1 FOR UPDATE`, [id])).rows[0];

  const insertStep = (db, id, office, next) => db.query(`INSERT INTO public.processed_document
    (ini_id,s_id,current_office_id,next_office_id) VALUES ($1,1,$2,$3)`, [id, office, next || null]);

  // NEW DOCUMENT SUBMISSION
  app.post('/api/documents', requireAuth, transaction(async (db, user, req) => {
    const {title, edc, customRoute, completeOriginProcessing = false, placeholderSelections = {}} = req.body;
    let {processTypeId} = req.body;
    if (![1,2,3,4].includes(Number(user.a_id))) throw fail(403, 'This account cannot submit documents.');
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 150) throw fail(400, 'Enter a document title of up to 150 characters.');
    if ((!customRoute && !Number.isInteger(processTypeId)) || typeof completeOriginProcessing !== 'boolean') throw fail(400, 'Select a valid pipeline and processing option.');
    if (typeof edc !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(edc) || Number.isNaN(Date.parse(`${edc}T00:00:00Z`)))
      throw fail(400, 'Estimated delivery must be calculated before submitting the document.');
    
    const custom = customRoute ? await require('./customRoutes').createCustomRoute(db,user,customRoute) : null;
    if (custom) processTypeId = custom.processTypeId;
    
    const route = custom ? custom.route : (await db.query(`SELECT r.* FROM public.process_type p JOIN public.route r ON p.r_id=r.r_id
      WHERE p.p_id=$1 AND p.is_active IS TRUE AND p.route_status='official' FOR SHARE OF p,r`, [processTypeId])).rows[0];
    if (!route) throw fail(400, 'Select an active pipeline.');
    
    const sequence = custom ? resolveRoute(route, user) : await resolveTemplateRoute(db, route, user, placeholderSelections);
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

    return {created:true, configurationChanged:Boolean(custom), message:'Document submitted.',qrCode,iniId:doc.public_id,
      broadcast:{originUserId:user.u_id,currentOfficeId:sequence[0],nextOfficeId:sequence[1]}};
  }));

  // PIPELINE ACTION ENDPOINTS (SCAN IN, OUT, SIGN, RETURN, ADHOC)
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
        if (step.is_adhoc && step.adhoc_return_office_id) {
          await db.query(`UPDATE public.processed_document SET s_id=4,next_office_id=NULL,is_returned_from_adhoc=true
            WHERE pd_id=(SELECT pd_id FROM public.processed_document
              WHERE ini_id=$1 AND current_office_id=$2 AND is_adhoc IS NOT TRUE AND time_out IS NULL
              ORDER BY pd_id DESC LIMIT 1)`, [doc.ini_id,step.adhoc_return_office_id]);
          const sendingOffice = (await db.query('SELECT office_name FROM public.offices WHERE o_id=$1', [user.o_id])).rows[0]?.office_name || 'the verifying office';
          await audit(db,doc.ini_id,user,`Halted: ${sendingOffice}`,step.adhoc_return_office_id);
        }
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
        const routingOffice = (await db.query('SELECT office_name FROM public.offices WHERE o_id=$1', [user.o_id])).rows[0]?.office_name || 'another office';
        await audit(db,doc.ini_id,user,`Ad-Hoc Incoming: ${routingOffice}`,target);
        message = 'Document routed for verification. It will return to your office to finish processing.';
      } else {
        await db.query(`UPDATE public.processed_document SET time_out=TIMEZONE('Asia/Manila',NOW()) WHERE pd_id=$1`, [step.pd_id]);
        if (step.s_id === 4) {
          await audit(db,doc.ini_id,user,'Scanned Out (Halted - Revision Required)');
          message = 'Released for correction. The submitting office or originator can now resubmit.';
        } else if (step.is_adhoc) {
          const requestingStep = (await db.query(`SELECT pd_id,is_returned_from_adhoc FROM public.processed_document
            WHERE ini_id=$1 AND current_office_id=$2 AND is_adhoc IS NOT TRUE AND time_out IS NULL
            ORDER BY pd_id DESC LIMIT 1`, [doc.ini_id,step.adhoc_return_office_id])).rows[0];
          if (requestingStep && !requestingStep.is_returned_from_adhoc)
            await db.query('UPDATE public.processed_document SET s_id=1 WHERE pd_id=$1', [requestingStep.pd_id]);
          
          if (doc.route_snapshot?.length) {
            const visits = (await db.query('SELECT * FROM public.processed_document WHERE ini_id=$1 ORDER BY pd_id', [doc.ini_id])).rows;
            const progress = routeProgress(doc.route_snapshot,visits);
            let following = progress.nextIndex + 1;
            while (progress.credits.has(following)) following++;
            if (requestingStep?.is_returned_from_adhoc) {
              if (doc.route_snapshot[progress.nextIndex])
                await insertStep(db,doc.ini_id,doc.route_snapshot[progress.nextIndex],doc.route_snapshot[following]);
              else await db.query('UPDATE public.processed_document SET s_id=5,next_office_id=NULL WHERE pd_id=$1', [step.pd_id]);
            } else await db.query(`UPDATE public.processed_document SET next_office_id=$2
              WHERE pd_id=$1`, [requestingStep?.pd_id,doc.route_snapshot[following] || null]);
          }
          await audit(db,doc.ini_id,user,'Scanned Out');
          if (requestingStep && !requestingStep.is_returned_from_adhoc) {
            const verifyingOffice = (await db.query('SELECT office_name FROM public.offices WHERE o_id=$1', [user.o_id])).rows[0]?.office_name || 'the verifying office';
            await audit(db,doc.ini_id,user,`Ad-Hoc Returned: ${verifyingOffice}`,step.adhoc_return_office_id);
          }
          message = requestingStep?.is_returned_from_adhoc
            ? 'Verification completed. The halted office was skipped and processing advanced.'
            : 'Verification completed. The document has returned to the requesting office.';
        } else {
          const sequence = doc.route_snapshot;
          if (!sequence?.length) throw fail(409,'This document needs its route migration before it can advance.');
          const visits = (await db.query(`SELECT * FROM public.processed_document
            WHERE ini_id=$1 ORDER BY pd_id`, [doc.ini_id])).rows;
          const progress = routeProgress(sequence,visits);
          const count = progress.nextIndex;
          let following = count + 1;
          while (progress.credits.has(following)) following++;
          
          await db.query('UPDATE public.processed_document SET next_office_id=$2 WHERE pd_id=$1',
            [step.pd_id,sequence[count] || null]);
          
          if (sequence[count]) await insertStep(db,doc.ini_id,sequence[count],sequence[following]);
          else await db.query(`UPDATE public.processed_document SET s_id=5,next_office_id=NULL
            WHERE pd_id=$1 OR pd_id=(SELECT MAX(pd_id) FROM public.processed_document WHERE ini_id=$2)`,
          [step.pd_id,doc.ini_id]);
          
          await audit(db,doc.ini_id,user,'Scanned Out');
          message = sequence[count] ? 'Released. The next office can now record Time In.' : 'Document processing completed.';
        }
      }

      // Collect the committed step configuration before notifying connected clients.
      const updatedStep = (await db.query('SELECT current_office_id, next_office_id FROM public.processed_document WHERE ini_id=$1 ORDER BY pd_id DESC LIMIT 1', [doc.ini_id])).rows[0];
      return {message,broadcast:{originUserId:doc.u_id,currentOfficeId:updatedStep?.current_office_id,
        nextOfficeId:updatedStep?.next_office_id,otherOfficeIds:[user.o_id,step.adhoc_return_office_id]}};
    }));
  }

  // RESUBMIT DOCUMENT
  app.post('/api/documents/:iniId/resubmit', requireAuth, transaction(async (db,user,req) => {
    req.body.iniId = req.params.iniId;
    const doc = await lockDoc(db,req);
    if (!(Number(doc.u_id) === Number(user.u_id) || (isOffice(user) && Number(doc.submission_office_id) === Number(user.o_id))))
      throw fail(403,'Only the submitter or submitting office can resubmit this document.');
    const step = (await db.query('SELECT * FROM public.processed_document WHERE ini_id=$1 ORDER BY pd_id DESC LIMIT 1 FOR UPDATE', [doc.ini_id])).rows[0];
    if (step?.s_id !== 4 || !step.time_out) throw fail(409,'Wait until the returning office has released the document for correction.');
    if (step.is_adhoc && step.adhoc_return_office_id) {
      const legacy = await db.query(`UPDATE public.processed_document
        SET s_id=4,next_office_id=NULL,is_returned_from_adhoc=true
        WHERE pd_id=(SELECT pd_id FROM public.processed_document
          WHERE ini_id=$1 AND current_office_id=$2 AND is_adhoc IS NOT TRUE
            AND time_out IS NULL AND is_returned_from_adhoc IS NOT TRUE
          ORDER BY pd_id DESC LIMIT 1)`, [doc.ini_id,step.adhoc_return_office_id]);
      if (legacy.rowCount) await audit(db,doc.ini_id,user,
        'Halted: Document returned to requestor for verification',step.adhoc_return_office_id);
    }
    
    const title = req.body.title?.trim();
    if (!title || title.length > 150) throw fail(400,'Enter a title of up to 150 characters.');
    
    await db.query('UPDATE public.initial_document SET title=$2 WHERE ini_id=$1', [doc.ini_id,title]);
    await db.query(`INSERT INTO public.processed_document
      (ini_id,s_id,current_office_id,next_office_id,is_adhoc,adhoc_return_office_id)
      VALUES ($1,1,$2,$3,$4,$5)`, [doc.ini_id,step.current_office_id,step.next_office_id,step.is_adhoc,step.adhoc_return_office_id]);
    
    await audit(db,doc.ini_id,user,'Resubmitted after correction',user.o_id || step.current_office_id);

    return {message:'Resubmitted to the office that requested corrections.',
      broadcast:{originUserId:doc.u_id,currentOfficeId:step.current_office_id,nextOfficeId:step.next_office_id,
        otherOfficeIds:[step.adhoc_return_office_id]}};
  }));
};
