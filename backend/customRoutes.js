const {fail} = require('./officeWorkflow');
const validName = value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 100;
async function createCustomRoute(db, user, body) {
  if (!body || !validName(body.processName)) throw fail(400,'Enter a process name of 1–100 characters.');
  if (!Array.isArray(body.stops) || body.stops.length < 2 || body.stops.length > 7 ||
    !body.stops.every(id => Number.isInteger(id) && id > 0 && id < 2147483648 && id !== 999))
    throw fail(400,'Select 2–7 office stops.');
  const offices = await db.query('SELECT o_id FROM public.offices WHERE o_id=ANY($1::integer[]) FOR KEY SHARE',[body.stops]);
  if (new Set(body.stops).size !== offices.rows.length) throw fail(400,'A selected office no longer exists.');
  let categoryId = null;
  if (body.categoryId) {
    if (!Number.isInteger(body.categoryId) || body.categoryId < 1 || body.categoryId > 2147483647) throw fail(400,'Invalid category.');
    const category = await db.query('SELECT category_id FROM public.document_category WHERE category_id=$1 FOR KEY SHARE',[body.categoryId]);
    if (!category.rows.length) throw fail(400,'Select an existing category.');
    categoryId = body.categoryId;
  } else if (!validName(body.categoryName)) throw fail(400,'Enter a category name of 1–100 characters.');
  const stops = [...body.stops,...Array(7-body.stops.length).fill(null)];
  const route = (await db.query('INSERT INTO public.route(stop_1,stop_2,stop_3,stop_4,stop_5,stop_6,stop_7) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',stops)).rows[0];
  const process = (await db.query(`INSERT INTO public.process_type(process_name,r_id,category_id,route_status,proposed_category_name,submitted_by)
    VALUES($1,$2,$3,'custom',$4,$5) RETURNING p_id`,[body.processName.trim(),route.r_id,categoryId,categoryId ? null : body.categoryName.trim(),user.u_id])).rows[0];
  return {processTypeId:process.p_id,route};
}
module.exports = {createCustomRoute};
