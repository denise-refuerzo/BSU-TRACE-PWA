const positiveId = value => /^(?:[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647;
const requireICT = (req, res, next) => Number(req.user.a_id) === 5
  ? next() : res.status(403).json({error: 'ICT administrator access required.'});
const fail = (status, message) => Object.assign(new Error(message), {status});
function validatePipeline(body) {
  if (typeof body.processName !== 'string' || !body.processName.trim() || body.processName.trim().length > 100)
    throw fail(400, 'Enter a process name of 1–100 characters.');
  if (!positiveId(body.categoryId)) throw fail(400, 'Select a valid document category.');
  if (!Array.isArray(body.stops) || body.stops.length < 2 || body.stops.length > 7 || !body.stops.every(positiveId))
    throw fail(400, 'Select between 2 and 7 valid office stops.');
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') throw fail(400, 'Invalid active status.');
}
module.exports = function registerDocumentCategories(app, pool, requireAuth) {
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
      FROM public.document_category c LEFT JOIN public.process_type p USING(category_id)
      GROUP BY c.category_id ORDER BY lower(c.category_name)`);
    res.json(result.rows);
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
    res.json({message: 'Category deleted.'});
  }));
  app.get('/api/process-types', requireAuth, handle(async (req, res) => {
    const {categoryId, q = '', active} = req.query;
    if (categoryId !== undefined && !positiveId(categoryId)) throw fail(400, 'Invalid category filter.');
    if (typeof q !== 'string' || q.length > 100 || (active !== undefined && !['true','false'].includes(active))) throw fail(400, 'Invalid search filters.');
    const stops = Array.from({length: 7}, (_, i) => i + 1);
    const result = await pool.query(`SELECT p.p_id,p.process_name,p.is_active,p.category_id,c.category_name,c.description AS category_description,r.r_id,
      ${stops.map(i => `r.stop_${i},o${i}.office_name AS stop_${i}_name`).join(',')}
      FROM public.process_type p JOIN public.document_category c USING(category_id)
      JOIN public.route r ON p.r_id=r.r_id
      ${stops.map(i => `LEFT JOIN public.offices o${i} ON r.stop_${i}=o${i}.o_id`).join(' ')}
      WHERE ($1::integer IS NULL OR p.category_id=$1)
      AND strpos(lower(p.process_name),lower($2)) > 0
      AND ($3::boolean IS NULL OR p.is_active=$3)
      ORDER BY lower(c.category_name),lower(p.process_name),p.p_id`,
    [categoryId || null, q.trim(), active === undefined ? null : active === 'true']);
    res.json(result.rows);
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
        const duplicate = await client.query('SELECT p_id FROM public.process_type WHERE lower(btrim(process_name))=lower($1) AND p_id<>$2', [processName.trim(), editing ? req.params.processId : 0]);
        if (duplicate.rows.length) throw fail(409, 'That process name already exists.');
        const category = await client.query('SELECT category_id FROM public.document_category WHERE category_id=$1 FOR KEY SHARE', [categoryId]);
        if (!category.rows.length) throw fail(400, 'Select an existing document category.');
        const routeStops = [...stops.map(Number), ...Array(7 - stops.length).fill(null)];
        if (editing) {
          const current = await client.query('SELECT r_id FROM public.process_type WHERE p_id=$1 FOR UPDATE', [req.params.processId]);
          if (!current.rows.length) throw fail(404, 'Pipeline not found.');
          await client.query(`UPDATE public.route SET ${routeStops.map((_, i) => `stop_${i + 1}=$${i + 1}`).join(',')} WHERE r_id=$8`, [...routeStops,current.rows[0].r_id]);
          await client.query('UPDATE public.process_type SET process_name=$1,category_id=$2,is_active=$3 WHERE p_id=$4', [processName.trim(), categoryId, isActive, req.params.processId]);
        } else {
          const route = await client.query('INSERT INTO public.route(stop_1,stop_2,stop_3,stop_4,stop_5,stop_6,stop_7) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING r_id', routeStops);
          await client.query('INSERT INTO public.process_type(process_name,r_id,category_id,is_active) VALUES($1,$2,$3,$4)', [processName.trim(),route.rows[0].r_id,categoryId,isActive]);
        }
        await client.query('COMMIT');
      } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
      res.status(editing ? 200 : 201).json({message: editing ? 'Workflow updated.' : 'Workflow created.'});
    }));
  }
};
module.exports.validatePipeline = validatePipeline;
