const expectedDocumentsSql = `SELECT idoc.public_id AS ini_id,idoc.title,idoc.qr_code,idoc.created_at,pt.process_name,creator.full_name AS requestor_name,
  COALESCE(curr_o.office_name,'Origin Station') AS current_office
  FROM public.initial_document idoc JOIN public.process_type pt ON idoc.p_id=pt.p_id
  JOIN public."User" creator ON idoc.u_id=creator.u_id
  LEFT JOIN LATERAL (SELECT * FROM public.processed_document pd WHERE pd.ini_id=idoc.ini_id
    ORDER BY (pd.time_out IS NULL) DESC,pd.pd_id DESC LIMIT 1) current_step ON TRUE
  LEFT JOIN public.offices curr_o ON current_step.current_office_id=curr_o.o_id
  WHERE $1=ANY(idoc.route_snapshot)
    AND idoc.lifecycle_state <> 'cancelled'
    AND (SELECT s_id FROM public.processed_document latest WHERE latest.ini_id=idoc.ini_id ORDER BY pd_id DESC LIMIT 1) NOT IN (4,5)
    AND NOT EXISTS (SELECT 1 FROM public.processed_document received WHERE received.ini_id=idoc.ini_id
      AND received.current_office_id=$1 AND received.time_in IS NOT NULL)
  ORDER BY idoc.ini_id DESC`;
const {routeProgress} = require('./routeProgress');
module.exports = function registerOfficeDocumentReads(app, pool, requireAuth) {
app.get('/api/documents/:userId', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT ON (idoc.ini_id)
             idoc.public_id AS ini_id,
             idoc.title, 
             idoc.edc, 
             idoc.qr_code, 
             idoc.created_at,
             idoc.submission_office_id,
             idoc.route_snapshot,
             idoc.lifecycle_state,
             idoc.cancelled_at,
             idoc.cancellation_reason,
             (SELECT full_name FROM public."User" WHERE u_id=idoc.u_id) AS submitted_by,
             pdoc.time_out AS release_time,
             pt.process_name,
             curr_o.office_name as current_office, 
             next_o.office_name as next_office, 
             CASE WHEN idoc.lifecycle_state='cancelled' THEN 'Cancelled' ELSE st.current_status END as status,
             (
               SELECT action_type 
               FROM public.office_action_history 
               WHERE ini_id = idoc.ini_id AND action_type LIKE 'Sent Back for Revision:%'
               ORDER BY history_id DESC 
               LIMIT 1
             ) as last_action,
             (
              SELECT json_agg(json_build_object(
                'office_name', off2.office_name,
                'pd_id', p2.public_id,
                'current_office_id', p2.current_office_id,
                's_id', p2.s_id,
                'time_in', p2.time_in AT TIME ZONE 'Asia/Manila',
                'time_out', p2.time_out AT TIME ZONE 'Asia/Manila',
                'is_adhoc', p2.is_adhoc
              ) ORDER BY p2.pd_id ASC)
               FROM public.processed_document p2
               JOIN public.offices off2 ON p2.current_office_id = off2.o_id
               WHERE p2.ini_id = idoc.ini_id
             ) as history_logs
      FROM public.initial_document idoc
      JOIN public.process_type pt ON idoc.p_id = pt.p_id
      LEFT JOIN LATERAL (SELECT * FROM public.processed_document pd WHERE pd.ini_id=idoc.ini_id ORDER BY CASE WHEN pd.s_id=4 AND pd.pd_id=(SELECT max(last.pd_id) FROM public.processed_document last WHERE last.ini_id=idoc.ini_id) THEN 0 WHEN pd.time_out IS NULL THEN 1 ELSE 2 END, pd.pd_id DESC LIMIT 1) pdoc ON TRUE
      LEFT JOIN public.offices curr_o ON pdoc.current_office_id = curr_o.o_id
      LEFT JOIN public.offices next_o ON pdoc.next_office_id = next_o.o_id
      LEFT JOIN public.status st ON pdoc.s_id = st.s_id
      WHERE idoc.u_id = $1
        AND NOT EXISTS (SELECT 1 FROM public.document_user_archives dua WHERE dua.ini_id=idoc.ini_id AND dua.user_id=$1)
      ORDER BY idoc.ini_id DESC, (pdoc.time_out IS NULL) DESC, pdoc.pd_id DESC;
    `;
    const result = await pool.query(query, [req.user.u_id]);
    res.json(result.rows.map(doc => ({...doc,
      history_logs: routeProgress(doc.route_snapshot || [],doc.history_logs || []).history
    })));
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Failed mapping logs' }); 
  }
});

// ==========================================
// 5.1 CREATE NEW DOCUMENT ENDPOINT
// ==========================================
// ==========================================
// 7. FETCH PROCESSOR ACTIVE DOCUMENTS ENDPOINT
// ==========================================
app.get('/api/processor/documents/:officeId', requireAuth, async (req, res) => {
  if (![2,3,4].includes(Number(req.user.a_id)) || Number(req.user.o_id) !== Number(req.params.officeId)) return res.status(403).json({error:"Access is limited to your assigned office."});
  const { officeId } = req.params;
  try {
    const query = `
      SELECT 
        idoc.public_id AS ini_id,
        idoc.title, 
        idoc.edc, 
        idoc.qr_code, 
        idoc.created_at, 
        pt.process_name,
        INITCAP(st.current_status) as status,
        curr_o.office_name as current_office, 
        next_o.office_name as next_office,
        pdoc.time_in,
        pdoc.time_out,
        pdoc.is_adhoc,
        pdoc.adhoc_return_office_id,
        r.stop_1 as route_start_id,
        creator.full_name AS requestor_name
      FROM public.processed_document pdoc
      JOIN public.initial_document idoc ON pdoc.ini_id = idoc.ini_id
      JOIN public.process_type pt ON idoc.p_id = pt.p_id
      JOIN public.route r ON pt.r_id = r.r_id
      JOIN public."User" creator ON idoc.u_id = creator.u_id
      LEFT JOIN public.offices curr_o ON pdoc.current_office_id = curr_o.o_id
      LEFT JOIN public.offices next_o ON pdoc.next_office_id = next_o.o_id
      LEFT JOIN public.status st ON pdoc.s_id = st.s_id
      WHERE pdoc.current_office_id = $1 AND pdoc.time_out IS NULL AND idoc.lifecycle_state <> 'cancelled'
      ORDER BY pdoc.pd_id DESC;
    `;
    const result = await pool.query(query, [parseInt(officeId)]);
    res.json(result.rows);
  } catch (err) {
    console.error("Processor active document lookup failure:", err);
    res.status(500).json({ error: "Failed to load active office document stream parameters." });
  }
});

// ==========================================
// 7.1 FETCH PROCESSOR PIPELINE ENDPOINT
// ==========================================
app.get('/api/processor/documents/pipeline/:officeId', requireAuth, async (req, res) => {
  if (![2,3,4].includes(Number(req.user.a_id)) || Number(req.user.o_id) !== Number(req.params.officeId)) return res.status(403).json({error:"Access is limited to your assigned office."});
  const { officeId } = req.params;
  try {
    const query = `
      SELECT DISTINCT ON (idoc.ini_id)
        idoc.public_id AS ini_id,
        idoc.title, 
        idoc.edc, 
        idoc.qr_code, 
        idoc.created_at, 
        pt.process_name,
        INITCAP(st.current_status) as status,
        (SELECT o.office_name 
         FROM public.processed_document first_pd 
         JOIN public.offices o ON first_pd.current_office_id = o.o_id 
         WHERE first_pd.ini_id = idoc.ini_id 
         ORDER BY first_pd.pd_id ASC LIMIT 1) as originating_office,
        curr_o.office_name as current_office, 
        next_o.office_name as next_office,
        pdoc_office.s_id AS office_status_id,
        pdoc_office.time_in,
        pdoc_office.time_out,
        pdoc_active.current_office_id,
        pdoc_active.is_adhoc AS current_step_is_adhoc,
        creator.full_name AS requestor_name
      FROM public.initial_document idoc
      JOIN public.process_type pt ON idoc.p_id = pt.p_id
      JOIN public.route r ON pt.r_id = r.r_id
      JOIN public."User" creator ON idoc.u_id = creator.u_id
      JOIN public.processed_document pdoc_office ON idoc.ini_id = pdoc_office.ini_id
      LEFT JOIN LATERAL (SELECT * FROM public.processed_document pd WHERE pd.ini_id=idoc.ini_id ORDER BY CASE WHEN pd.s_id=4 AND pd.pd_id=(SELECT max(last.pd_id) FROM public.processed_document last WHERE last.ini_id=idoc.ini_id) THEN 0 WHEN pd.time_out IS NULL THEN 1 ELSE 2 END, pd.pd_id DESC LIMIT 1) pdoc_active ON TRUE
      LEFT JOIN public.offices curr_o ON COALESCE(pdoc_active.current_office_id, pdoc_office.current_office_id) = curr_o.o_id
      LEFT JOIN public.offices next_o ON pdoc_active.next_office_id = next_o.o_id
      LEFT JOIN public.status st ON COALESCE(pdoc_active.s_id, pdoc_office.s_id) = st.s_id
      WHERE pdoc_office.current_office_id = $1 AND idoc.lifecycle_state <> 'cancelled'
      ORDER BY idoc.ini_id DESC, pdoc_office.pd_id DESC;
    `;
    const result = await pool.query(query, [parseInt(officeId)]);
    res.json(result.rows);
  } catch (err) {
    console.error("Pipeline analytics ledger parsing fault:", err);
    res.status(500).json({ error: "Failed compiling analytical structural route loops." });
  }
});

// ==========================================
// 7.2 AD-HOC VERIFICATION DETOUR ENDPOINT
// ==========================================
// ==========================================
// 7.3 FETCH PROCESSOR HISTORY ENDPOINT
// ==========================================
app.get('/api/processor/history/:officeId', requireAuth, async (req, res) => {
  if (![2,3,4].includes(Number(req.user.a_id)) || Number(req.user.o_id) !== Number(req.params.officeId)) return res.status(403).json({error:"Access is limited to your assigned office."});
  const { officeId } = req.params;
  try {
    const query = `
      SELECT 
        h.public_id AS history_id,
        h.action_type,
        CASE WHEN h.legacy_manila_wall_time THEN h.action_timestamp - INTERVAL '8 hours' ELSE h.action_timestamp END AS action_timestamp,
        u.full_name,
        idoc.title,
        idoc.qr_code,
        idoc.public_id AS ini_id,
        idoc.edc,
        idoc.created_at, 
        pt.process_name,
        COALESCE(INITCAP(st.current_status), 'Active Path') as status,
        curr_o.office_name as current_office,
        next_o.office_name as next_office,
        pdoc.time_in,
        pdoc.time_out,
        pdoc.is_adhoc,
        creator.full_name AS requestor_name
      FROM public.office_action_history h
      JOIN public."User" u ON h.u_id = u.u_id
      JOIN public.initial_document idoc ON h.ini_id = idoc.ini_id
      JOIN public.process_type pt ON idoc.p_id = pt.p_id
      JOIN public."User" creator ON idoc.u_id = creator.u_id
      LEFT JOIN LATERAL (
        SELECT pd.time_in, pd.time_out, pd.is_adhoc, pd.s_id, pd.current_office_id, pd.next_office_id
        FROM public.processed_document pd
        WHERE pd.ini_id = h.ini_id 
          AND pd.current_office_id = h.o_id
        ORDER BY pd.pd_id DESC
        LIMIT 1
      ) pdoc ON TRUE
      LEFT JOIN public.offices curr_o ON h.o_id = curr_o.o_id
      LEFT JOIN public.offices next_o ON pdoc.next_office_id = next_o.o_id
      LEFT JOIN public.status st ON pdoc.s_id = st.s_id
      WHERE h.o_id = $1
      ORDER BY h.history_id DESC;
    `;
    const result = await pool.query(query, [parseInt(officeId)]);
    res.json(result.rows);
  } catch (err) {
    console.error("Audit trail lookup mapping error:", err);
    res.status(500).json({ error: "Failed to map historical action segments." });
  }
});

// ==========================================
// 7.4 FETCH PROCESSOR KPI METRICS SUMMARY
// ==========================================
app.get('/api/processor/documents/kpi-metrics/:officeId', requireAuth, async (req, res) => {
  if (![2,3,4].includes(Number(req.user.a_id)) || Number(req.user.o_id) !== Number(req.params.officeId)) return res.status(403).json({error:"Access is limited to your assigned office."});
  const officeId = parseInt(req.params.officeId);

  try {
    const incoming=await pool.query(expectedDocumentsSql,[officeId]);
    const result=await pool.query(`WITH latest AS (SELECT DISTINCT ON(pd.ini_id) pd.* FROM public.processed_document pd
      JOIN public.initial_document idoc ON idoc.ini_id=pd.ini_id
      WHERE pd.current_office_id=$1 AND idoc.lifecycle_state <> 'cancelled' ORDER BY pd.ini_id,pd.pd_id DESC)
      SELECT count(*) FILTER(WHERE time_in IS NULL AND time_out IS NULL AND s_id=1)::int AS awaiting,
      count(*) FILTER(WHERE time_in IS NOT NULL AND time_out IS NULL AND s_id IN(1,2,3))::int AS pending,
      count(*) FILTER(WHERE time_out IS NULL AND s_id=2)::int AS verification,
      count(*) FILTER(WHERE time_out IS NOT NULL AND s_id IN(3,5))::int AS completed
      FROM latest`,[officeId]);
    const counts=result.rows[0];
    res.json({incomingCount:incoming.rows.length,awaitingScanInCount:counts.awaiting,pendingCount:counts.pending,
      inVerificationCount:counts.verification,completedProcessingCount:counts.completed});

  } catch (err) {
    console.error("KPI Metrics Calculation Error:", err);
    res.status(500).json({ error: "Failed to calculate processor metrics." });
  }
});

// ==========================================
// 7.5 FETCH INCOMING DOCUMENTS LIST ENDPOINT
// ==========================================
app.get('/api/processor/documents/expected-count/:officeId', requireAuth, async (req, res) => {
  if (![2,3,4].includes(Number(req.user.a_id)) || Number(req.user.o_id) !== Number(req.params.officeId)) return res.status(403).json({error:"Access is limited to your assigned office."});
  const officeId = parseInt(req.params.officeId);
  try {
    const result = await pool.query(`SELECT COUNT(*)::integer AS count FROM (${expectedDocumentsSql}) AS incoming`, [officeId]);
    res.json({count: result.rows[0]?.count || 0});
  } catch (err) {
    console.error("Expected incoming documents count error:", err);
    res.status(500).json({ error: "Failed to count expected documents." });
  }
});

app.get('/api/processor/documents/expected-list/:officeId', requireAuth, async (req, res) => {
  if (![2,3,4].includes(Number(req.user.a_id)) || Number(req.user.o_id) !== Number(req.params.officeId)) return res.status(403).json({error:"Access is limited to your assigned office."});
  const officeId = parseInt(req.params.officeId);
  try {
    const result = await pool.query(expectedDocumentsSql,[officeId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Expected incoming documents list error:", err);
    res.status(500).json({ error: "Failed to pull expected documents list." });
  }
});

// ==========================================
// 8. SIGNEE: APPROVE & SIGN ENDPOINT
// ==========================================

};
