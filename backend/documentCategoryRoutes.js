const positiveId = value => /^(?:[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647;
const requireICT = (req, res, next) => Number(req.user.a_id) === 5
  ? next() : res.status(403).json({error: 'ICT administrator access required.'});
const fail = (status, message) => Object.assign(new Error(message), {status});
const {officeGroupMembershipSql} = require('./officeRouteGroups');
function validatePipeline(body) {
  if (typeof body.processName !== 'string' || !body.processName.trim() || body.processName.trim().length > 100)
    throw fail(400, 'Enter a process name of 1–100 characters.');
  if (!positiveId(body.categoryId)) throw fail(400, 'Select a valid document category.');
  if (!Array.isArray(body.stops) || body.stops.length < 2 || body.stops.length > 7)
    throw fail(400, 'Select between 2 and 7 valid office or category stops.');
  const validStops = body.stops.every(stop => positiveId(stop) || (stop && stop.type === 'group' && positiveId(stop.groupId)));
  if (!validStops) throw fail(400, 'Every pipeline stop must be a valid office or office category.');
  const fixedStops = body.stops.filter(positiveId).map(Number);
  if (new Set(fixedStops).size !== fixedStops.length) throw fail(400, 'A pipeline cannot repeat the same fixed office.');
  for (const [index, stop] of body.stops.entries()) {
    if (stop?.type === 'group' && (typeof stop.label !== 'string' || !stop.label.trim() || stop.label.trim().length > 150))
      throw fail(400, `Enter a label of 1–150 characters for category stop ${index + 1}.`);
  }
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') throw fail(400, 'Invalid active status.');
}
module.exports = function registerDocumentCategories(app, pool, requireAuth) {
  const broadcastIctConfiguration = req => req.app?.get?.('io')?.to('ict_admin_room').emit('admin-configuration-updated');
  const handle = fn => async (req, res) => {
    try { await fn(req, res); } catch (err) {
      const status = err.status || (err.code === '23505' ? 409 : err.code === '23503' ? 409 : 500);
      const message = err.status ? err.message : err.code === '23505' ? 'That name already exists.'
        : err.code === '23503' ? 'This record is still in use, or a selected category or office no longer exists.'
        : 'Unable to save or load workflow configuration. Please try again.';
      res.status(status).json({error: message});
    }
  };
  app.get('/api/document-categories', requireAuth, handle(async (req, res) => {
    const result = await pool.query(`SELECT c.*, count(p.p_id)::int AS pipeline_count,
      count(p.p_id) FILTER (WHERE p.is_active IS TRUE)::int AS active_pipeline_count
      FROM public.document_category c LEFT JOIN public.process_type p ON p.category_id=c.category_id AND p.route_status='official'
      GROUP BY c.category_id ORDER BY lower(c.category_name)`);
    res.json(result.rows);
  }));
  app.get('/api/office-route-groups', requireAuth, handle(async (req, res) => {
    const result = await pool.query(`SELECT g.group_id,g.group_name,g.description,
      COALESCE(json_agg(json_build_object('id',o.o_id,'name',o.office_name) ORDER BY lower(o.office_name)) FILTER (WHERE o.o_id IS NOT NULL),'[]'::json) AS offices
      FROM public.office_route_groups g
      LEFT JOIN public.offices o ON ${officeGroupMembershipSql}
      WHERE g.is_active IS TRUE
      GROUP BY g.group_id ORDER BY lower(g.group_name)`);
    res.json(result.rows);
  }));
  app.get('/api/admin/office-route-groups', requireAuth, requireICT, handle(async (req, res) => {
    const result = await pool.query(`SELECT g.group_id,g.group_name,g.description,g.is_active,
      COALESCE(json_agg(json_build_object('id',o.o_id,'name',o.office_name) ORDER BY lower(o.office_name)) FILTER (WHERE o.o_id IS NOT NULL),'[]'::json) AS offices,
      (SELECT count(*)::int FROM public.route r WHERE g.group_id=ANY(ARRAY[r.stop_1_group_id,r.stop_2_group_id,r.stop_3_group_id,r.stop_4_group_id,r.stop_5_group_id,r.stop_6_group_id,r.stop_7_group_id])) AS workflow_count
      FROM public.office_route_groups g LEFT JOIN public.offices o ON ${officeGroupMembershipSql}
      GROUP BY g.group_id ORDER BY lower(g.group_name)`);
    res.json(result.rows);
  }));
  for (const method of ['post','put']) {
    app[method]('/api/admin/office-route-groups' + (method === 'put' ? '/:groupId' : ''), requireAuth, requireICT, handle(async (req, res) => {
      const editing = method === 'put';
      if (editing && !positiveId(req.params.groupId)) throw fail(400, 'Invalid office category ID.');
      const {groupName, description = '', officeIds} = req.body;
      if (typeof groupName !== 'string' || !groupName.trim() || groupName.trim().length > 150 ||
          typeof description !== 'string' || description.length > 2000 ||
          !Array.isArray(officeIds) || !officeIds.length || officeIds.some(id => !positiveId(id)) ||
          new Set(officeIds.map(Number)).size !== officeIds.length)
        throw fail(400, 'Enter a category name, description, and at least one valid office.');
      if (groupName.trim().toLowerCase() === 'all offices') throw fail(400, 'All offices is managed automatically.');
      const db = await pool.connect();
      try {
        await db.query('BEGIN');
        await db.query('SELECT pg_advisory_xact_lock(90412028)');
        const current = editing ? (await db.query('SELECT * FROM public.office_route_groups WHERE group_id=$1 FOR UPDATE', [req.params.groupId])).rows[0] : null;
        if (editing && !current) throw fail(404, 'Office category not found.');
        if (current?.group_name.trim().toLowerCase() === 'all offices') throw fail(400, 'All offices is managed automatically.');
        const duplicate = await db.query('SELECT group_id FROM public.office_route_groups WHERE lower(btrim(group_name))=lower($1) AND group_id<>$2', [groupName.trim(), editing ? req.params.groupId : 0]);
        if (duplicate.rowCount) throw fail(409, 'An office category with that name already exists.');
        const validOffices = await db.query('SELECT o_id FROM public.offices WHERE o_id=ANY($1::integer[]) AND o_id<>999 FOR KEY SHARE', [officeIds.map(Number)]);
        if (validOffices.rowCount !== officeIds.length) throw fail(400, 'Choose existing offices for this category.');
        const organizational = await db.query('SELECT o_id FROM public.offices WHERE lower(btrim(office_category))=lower($1)', [current?.group_name || groupName.trim()]);
        if (organizational.rows.some(office => !officeIds.map(Number).includes(office.o_id)))
          throw fail(400, 'An office uses this as its organizational category. Change that office category before removing it.');
        const group = editing
          ? await db.query('UPDATE public.office_route_groups SET group_name=$1,description=$2,is_active=true WHERE group_id=$3 RETURNING group_id', [groupName.trim(), description.trim(), req.params.groupId])
          : await db.query('INSERT INTO public.office_route_groups(group_name,description,is_active) VALUES($1,$2,true) RETURNING group_id', [groupName.trim(), description.trim()]);
        const groupId = group.rows[0].group_id;
        if (editing && current.group_name !== groupName.trim())
          await db.query('UPDATE public.offices SET office_category=$1 WHERE lower(btrim(office_category))=lower($2)', [groupName.trim(), current.group_name]);
        if (editing) await db.query('DELETE FROM public.office_route_group_members WHERE group_id=$1', [groupId]);
        await db.query('INSERT INTO public.office_route_group_members(group_id,office_id) SELECT $1,unnest($2::integer[])', [groupId, officeIds.map(Number)]);
        await db.query('COMMIT');
        broadcastIctConfiguration(req);
        res.status(editing ? 200 : 201).json({groupId,message:editing ? 'Office category updated.' : 'Office category created.'});
      } catch (err) { await db.query('ROLLBACK'); throw err; } finally { db.release(); }
    }));
  }
  app.delete('/api/admin/office-route-groups/:groupId', requireAuth, requireICT, handle(async (req, res) => {
    if (!positiveId(req.params.groupId)) throw fail(400, 'Invalid office category ID.');
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const group = (await db.query('SELECT * FROM public.office_route_groups WHERE group_id=$1 FOR UPDATE', [req.params.groupId])).rows[0];
      if (!group) throw fail(404, 'Office category not found.');
      if (group.group_name.trim().toLowerCase() === 'all offices') throw fail(400, 'All offices is managed automatically.');
      const assigned = await db.query('SELECT 1 FROM public.offices WHERE lower(btrim(office_category))=lower($1) LIMIT 1', [group.group_name]);
      if (assigned.rowCount) throw fail(409, 'Change the organizational category on its offices before deleting this category.');
      const used = await db.query(`SELECT 1 FROM public.route WHERE $1=ANY(ARRAY[stop_1_group_id,stop_2_group_id,stop_3_group_id,stop_4_group_id,stop_5_group_id,stop_6_group_id,stop_7_group_id]) LIMIT 1`, [group.group_id]);
      if (used.rowCount) throw fail(409, 'This category is used by a workflow. Edit those workflows before deleting it.');
      await db.query('DELETE FROM public.office_route_groups WHERE group_id=$1', [group.group_id]);
      await db.query('COMMIT');
      broadcastIctConfiguration(req);
      res.json({message:'Office category deleted.'});
    } catch (err) { await db.query('ROLLBACK'); if (err.code === '23503') throw fail(409, 'This category is still in use.'); throw err; }
    finally { db.release(); }
  }));
  app.get('/api/custom-routes', requireAuth, requireICT, handle(async (req,res) => {
    const result = await pool.query(`SELECT p.*,COALESCE(c.category_name,p.proposed_category_name) AS category_name,
      u.full_name AS submitter_name, ARRAY(SELECT o.office_name FROM public.route r,
      unnest(ARRAY[r.stop_1,r.stop_2,r.stop_3,r.stop_4,r.stop_5,r.stop_6,r.stop_7]) WITH ORDINALITY AS step(id,pos)
      JOIN public.offices o ON o.o_id=step.id WHERE r.r_id=p.r_id ORDER BY step.pos) AS route_names
      FROM public.process_type p LEFT JOIN public.document_category c USING(category_id)
      LEFT JOIN public."User" u ON u.u_id=p.submitted_by
      WHERE p.submitted_by IS NOT NULL ORDER BY p.proposed_at DESC,p.p_id DESC`);
    res.json(result.rows);
  }));
  app.post('/api/custom-routes/:processId/review', requireAuth, requireICT, handle(async (req,res) => {
    if (!positiveId(req.params.processId) || !['approve','decline'].includes(req.body.decision)) throw fail(400,'Invalid review.');
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query('SELECT pg_advisory_xact_lock(90412027)');
      const p = (await db.query('SELECT * FROM public.process_type WHERE p_id=$1 FOR UPDATE',[req.params.processId])).rows[0];
      if (!p || p.route_status !== 'custom') throw fail(409,'This route has already been reviewed or is unavailable.');
      let category = p.category_id;
      if (req.body.decision === 'approve') {
        const name = req.body.processName === undefined ? p.process_name : req.body.processName;
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) throw fail(400,'Enter a process name of 1–100 characters.');
        const duplicate = await db.query("SELECT p_id FROM public.process_type WHERE route_status='official' AND lower(btrim(process_name))=lower($1)",[name.trim()]);
        if (duplicate.rows.length) throw fail(409,'An official process already has that name. Rename this proposal before approving.');
        if (!category) {
          // Serialize with category writes so concurrent creation cannot duplicate names.
          await db.query('LOCK TABLE public.document_category IN SHARE ROW EXCLUSIVE MODE');
          category = (await db.query('SELECT category_id FROM public.document_category WHERE lower(btrim(category_name))=lower($1)',[p.proposed_category_name])).rows[0]?.category_id;
          if (!category) category = (await db.query('INSERT INTO public.document_category(category_name) VALUES($1) RETURNING category_id',[p.proposed_category_name])).rows[0].category_id;
        }
        await db.query("UPDATE public.process_type SET process_name=$2,category_id=$3,route_status='official',is_active=true,reviewed_by=$4,reviewed_at=NOW() WHERE p_id=$1",[p.p_id,name.trim(),category,req.user.u_id]);
      } else await db.query("UPDATE public.process_type SET route_status='declined',reviewed_by=$2,reviewed_at=NOW() WHERE p_id=$1",[p.p_id,req.user.u_id]);
      await db.query('COMMIT');
      broadcastIctConfiguration(req);
      res.json({message:req.body.decision === 'approve' ? 'Route is now official.' : 'Route remains private. Existing documents continue processing.'});
    } catch(err) {await db.query('ROLLBACK');throw err;} finally {db.release();}
  }));
  for (const method of ['post', 'put']) {
    app[method]('/api/document-categories' + (method === 'put' ? '/:categoryId' : ''), requireAuth, requireICT, handle(async (req, res) => {
      const {categoryName, description = ''} = req.body;
      if (typeof categoryName !== 'string' || !categoryName.trim() || categoryName.trim().length > 100 || typeof description !== 'string' || description.length > 2000)
        throw fail(400, 'Enter a category name (1–100 characters) and description (up to 2000 characters).');
      if (method === 'put' && !positiveId(req.params.categoryId)) throw fail(400, 'Invalid category ID.');
      const result = await pool.query(method === 'post'
        ? 'INSERT INTO public.document_category(category_name,description) VALUES($1,$2) RETURNING *'
        : 'UPDATE public.document_category SET category_name=$1,description=$2 WHERE category_id=$3 RETURNING *',
      [categoryName.trim(), description.trim(), ...(method === 'put' ? [req.params.categoryId] : [])]);
      if (!result.rows.length) throw fail(404, 'Category not found.');
      broadcastIctConfiguration(req);
      res.status(method === 'post' ? 201 : 200).json(result.rows[0]);
    }));
  }
  app.delete('/api/document-categories/:categoryId', requireAuth, requireICT, handle(async (req, res) => {
    if (!positiveId(req.params.categoryId)) throw fail(400, 'Invalid category ID.');
    try {
      const result = await pool.query('DELETE FROM public.document_category WHERE category_id=$1 RETURNING category_id', [req.params.categoryId]);
      if (!result.rows.length) throw fail(404, 'Category not found.');
    } catch (err) {
      if (err.code === '23503') throw fail(409, 'Reassign all pipelines, including archived pipelines, before deleting this category.');
      throw err;
    }
    broadcastIctConfiguration(req);
    res.json({message: 'Category deleted.'});
  }));
  app.get('/api/process-types', requireAuth, handle(async (req, res) => {
    const {categoryId, q = '', active} = req.query;
    if (categoryId !== undefined && !positiveId(categoryId)) throw fail(400, 'Invalid category filter.');
    if (typeof q !== 'string' || q.length > 100 || (active !== undefined && !['true','false'].includes(active))) throw fail(400, 'Invalid search filters.');
    const stops = Array.from({length: 7}, (_, i) => i + 1);
    const result = await pool.query(`SELECT p.p_id,p.process_name,p.is_active,p.category_id,c.category_name,c.description AS category_description,r.r_id,
      ${stops.map(i => `r.stop_${i},r.stop_${i}_label,o${i}.office_name AS stop_${i}_name,r.stop_${i}_group_id,g${i}.group_name AS stop_${i}_group_name,CASE WHEN r.stop_${i}_group_id IS NULL THEN 'office' ELSE 'group' END AS stop_${i}_kind`).join(',')}
      FROM public.process_type p JOIN public.document_category c USING(category_id)
      JOIN public.route r ON p.r_id=r.r_id
      ${stops.map(i => `LEFT JOIN public.offices o${i} ON r.stop_${i}=o${i}.o_id LEFT JOIN public.office_route_groups g${i} ON r.stop_${i}_group_id=g${i}.group_id`).join(' ')}
      WHERE p.route_status='official' AND ($1::integer IS NULL OR p.category_id=$1)
      AND strpos(lower(p.process_name),lower($2)) > 0
      AND ($3::boolean IS NULL OR p.is_active=$3)
      ORDER BY lower(c.category_name),lower(p.process_name),p.p_id`,
    [categoryId || null, q.trim(), active === undefined ? null : active === 'true']);
    const {resolveRoute} = require('./officeWorkflow');
    const officeNames = new Map((await pool.query('SELECT o_id,office_name FROM public.offices')).rows.map(o=>[o.o_id,o.office_name]));
    res.json(result.rows.map(p=>{
      const sequence=resolveRoute(p,req.user);
      return {...p,resolved_origin_office_id:p.stop_1_group_id ? null : sequence[0],
        resolved_route_ids:sequence.map((id,index)=>p[`stop_${index + 1}_group_id`] ? null : id),
        resolved_route_names:sequence.map((id,index)=>
        p[`stop_${index + 1}_group_id`] ? (p[`stop_${index + 1}_label`] || p[`stop_${index + 1}_group_name`]) : (officeNames.get(id) || 'Office'))};
    }));
  }));
  for (const method of ['post','put']) {
    app[method]('/api/process-types' + (method === 'put' ? '/:processId' : ''), requireAuth, requireICT, handle(async (req, res) => {
      validatePipeline(req.body);
      const editing = method === 'put';
      if (editing && !positiveId(req.params.processId)) throw fail(400, 'Invalid pipeline ID.');
      const {processName, categoryId, stops, isActive = true} = req.body;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Serialize name checks for these workflow writers.
        await client.query('SELECT pg_advisory_xact_lock(90412027)');
        const duplicate = await client.query("SELECT p_id FROM public.process_type WHERE route_status='official' AND lower(btrim(process_name))=lower($1) AND p_id<>$2", [processName.trim(), editing ? req.params.processId : 0]);
        if (duplicate.rows.length) throw fail(409, 'That process name already exists.');
        const category = await client.query('SELECT category_id FROM public.document_category WHERE category_id=$1 FOR KEY SHARE', [categoryId]);
        if (!category.rows.length) throw fail(400, 'Select an existing document category.');
        const routeStops = Array.from({length: 7}, (_, index) => {
          const stop = stops[index];
          return positiveId(stop) ? Number(stop) : null;
        });
        const routeGroups = Array.from({length: 7}, (_, index) => {
          const stop = stops[index];
          return stop && typeof stop === 'object' ? Number(stop.groupId) : null;
        });
        const groupIds = routeGroups.filter(Boolean);
        const routeLabels = Array.from({length: 7}, (_, index) => stops[index]?.type === 'group' ? stops[index].label.trim() : null);
        if (groupIds.length) {
          const groups = await client.query(`SELECT g.group_id,MIN(o.o_id)::integer AS anchor_office_id FROM public.office_route_groups g
            JOIN public.offices o ON ${officeGroupMembershipSql}
            WHERE g.is_active IS TRUE AND g.group_id = ANY($1::integer[])
            GROUP BY g.group_id`, [groupIds]);
          if (groups.rowCount !== new Set(groupIds).size) throw fail(400, 'Every selected office category must be active and valid.');
          const anchors = new Map(groups.rows.map(group => [Number(group.group_id), Number(group.anchor_office_id)]));
          routeGroups.forEach((groupId, index) => {
            if (groupId) routeStops[index] = anchors.get(groupId);
          });
        }
        if (editing) {
          const current = await client.query("SELECT r_id FROM public.process_type WHERE p_id=$1 AND route_status='official' FOR UPDATE", [req.params.processId]);
          if (!current.rows.length) throw fail(404, 'Pipeline not found.');
          await client.query(`UPDATE public.route SET ${routeStops.map((_, i) => `stop_${i + 1}=$${i + 1},stop_${i + 1}_group_id=$${i + 8},stop_${i + 1}_label=$${i + 15}`).join(',')} WHERE r_id=$22`, [...routeStops, ...routeGroups, ...routeLabels, current.rows[0].r_id]);
          await client.query('UPDATE public.process_type SET process_name=$1,category_id=$2,is_active=$3 WHERE p_id=$4', [processName.trim(), categoryId, isActive, req.params.processId]);
        } else {
          const columns = ['','_group_id','_label'].flatMap(suffix => routeStops.map((_, i) => `stop_${i + 1}${suffix}`));
          const route = await client.query(`INSERT INTO public.route(${columns.join(',')}) VALUES(${columns.map((_, i) => `$${i + 1}`).join(',')}) RETURNING r_id`, [...routeStops, ...routeGroups, ...routeLabels]);
          await client.query('INSERT INTO public.process_type(process_name,r_id,category_id,is_active) VALUES($1,$2,$3,$4)', [processName.trim(),route.rows[0].r_id,categoryId,isActive]);
        }
        await client.query('COMMIT');
      } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
      broadcastIctConfiguration(req);
      res.status(editing ? 200 : 201).json({message: editing ? 'Workflow updated.' : 'Workflow created.'});
    }));
  }
  app.delete('/api/process-types/:processId', requireAuth, requireICT, handle(async (req, res) => {
    if (!positiveId(req.params.processId)) throw fail(400, 'Invalid pipeline ID.');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query("SELECT r_id FROM public.process_type WHERE p_id=$1 AND route_status='official' FOR UPDATE", [req.params.processId]);
      if (!current.rows.length) throw fail(404, 'Pipeline not found.');
      await client.query('DELETE FROM public.process_type WHERE p_id=$1', [req.params.processId]);
      await client.query('DELETE FROM public.route WHERE r_id=$1 AND NOT EXISTS (SELECT 1 FROM public.process_type WHERE r_id=$1)', [current.rows[0].r_id]);
      await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); if (err.code === '23503') throw fail(409, 'This pipeline has transaction records and cannot be deleted. Archive it instead.'); throw err; }
    finally { client.release(); }
    broadcastIctConfiguration(req);
    res.json({message:'Workflow deleted.'});
  }));
};
module.exports.validatePipeline = validatePipeline;
