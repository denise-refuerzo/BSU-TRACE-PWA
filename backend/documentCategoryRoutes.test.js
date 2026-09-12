const test = require('node:test');
const assert = require('node:assert/strict');
const register = require('./documentCategoryRoutes');

function setup(query) {
  const routes = new Map();
  const app = Object.fromEntries(['get','post','put','delete'].map(method => [method, (path, ...handlers) => routes.set(`${method} ${path}`, handlers)]));
  const queries = [];
  const client = { async query(sql, params) { queries.push({sql, params}); return { rows: await query(sql, params) }; }, release() {} };
  const auth = (req, res, next) => req.user ? next() : res.status(401).json({error: 'Unauthorized'});
  register(app, {...client, connect: async () => client}, auth);
  return {queries, async request(route, values = {}) {
    const req = {user: {a_id: 5}, body: {}, params: {}, query: {}, ...values};
    const res = {code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; }};
    const handlers = routes.get(route);
    assert.ok(handlers, route);
    let i = 0;
    const next = async () => { if (i < handlers.length) await handlers[i++](req, res, next); };
    await next(); return res;
  }};
}
const pipeline = {processName: 'Test proposal', categoryId: 2, stops: [999, 3], isActive: true};

test('all category and pipeline writes require authentication and ICT role', async () => {
  const app = setup(() => { throw new Error('Database must not be reached'); });
  for (const route of ['post /api/document-categories','put /api/document-categories/:categoryId','delete /api/document-categories/:categoryId','post /api/process-types','put /api/process-types/:processId']) {
    assert.equal((await app.request(route, {user: undefined})).code, 401);
    assert.equal((await app.request(route, {user: {a_id: 1}})).code, 403);
  }
});
test('global and filtered searches preserve route data and parameterize filters', async () => {
  const app = setup(() => [{p_id: 13, category_id: 2, stop_1_name: 'Origin office'}]);
  const global = await app.request('get /api/process-types', {user: {a_id: 1}});
  assert.equal(global.body[0].stop_1_name, 'Origin office');
  assert.deepEqual(app.queries[0].params, [null, '', null]);
  await app.request('get /api/process-types', {query: {categoryId: '2', q: "Proposal'_%", active: 'true'}});
  assert.deepEqual(app.queries[1].params, ['2', "Proposal'_%", true]);
  assert.ok(!app.queries[1].sql.includes("Proposal'_%"));
  assert.equal((await app.request('get /api/process-types', {query: {categoryId: '2x'}})).code, 400);
});
test('category names are trimmed and duplicate names return a conflict', async () => {
  const app = setup((sql, params) => [{category_id: 6, category_name: params[0]}]);
  const res = await app.request('post /api/document-categories', {body: {categoryName: '  Research  '}});
  assert.equal(res.code, 201); assert.equal(res.body.category_name, 'Research');
  const duplicate = setup(() => { throw {code: '23505'}; });
  assert.equal((await duplicate.request('post /api/document-categories', {body: {categoryName: 'Research'}})).code, 409);
  assert.equal((await app.request('post /api/document-categories', {body: {categoryName: '   '}})).code, 400);
});
test('category renaming updates in place and missing categories return 404', async () => {
  const app = setup((sql, params) => [{category_id: params[2], category_name: params[0]}]);
  const res = await app.request('put /api/document-categories/:categoryId', {params: {categoryId: '2'}, body: {categoryName: 'Initiatives', description: 'Updated'}});
  assert.equal(res.body.category_id, '2');
  assert.deepEqual(app.queries[0].params, ['Initiatives', 'Updated', '2']);
  const empty = setup(() => []);
  assert.equal((await empty.request('put /api/document-categories/:categoryId', {params: {categoryId: '2'}, body: {categoryName: 'Initiatives'}})).code, 404);
});
test('foreign key deletion conflicts explain archived pipeline safeguard', async () => {
  const app = setup(() => { throw {code: '23503'}; });
  const res = await app.request('delete /api/document-categories/:categoryId', {params: {categoryId: '2'}});
  assert.equal(res.code, 409); assert.match(res.body.error, /including archived/);
  const empty = setup(() => []);
  assert.equal((await empty.request('delete /api/document-categories/:categoryId', {params: {categoryId: '2'}})).code, 404);
  const existing = setup(() => [{category_id: 2}]);
  assert.equal((await existing.request('delete /api/document-categories/:categoryId', {params: {categoryId: '2'}})).code, 200);
});
test('pipeline validation rejects missing categories, malformed stops, and oversized names', () => {
  assert.doesNotThrow(() => register.validatePipeline(pipeline));
  for (const change of [{categoryId: ''}, {categoryId: '2x'}, {stops: [1]}, {stops: [1,null]}, {stops: Array(8).fill(1)}, {processName: ' '}, {processName: 'a'.repeat(101)}, {isActive: 'true'}]) {
    assert.throws(() => register.validatePipeline({...pipeline,...change}), {status: 400});
  }
});
test('pipeline creation saves category and stops in a single transaction', async () => {
  const app = setup(sql => sql.includes('FROM public.document_category') ? [{category_id: 2}] : sql.includes('RETURNING r_id') ? [{r_id: 42}] : []);
  const res = await app.request('post /api/process-types', {body: pipeline});
  assert.equal(res.code, 201);
  assert.deepEqual(app.queries.find(q => q.sql.startsWith('INSERT INTO public.process_type')).params, ['Test proposal',42,2,true]);
  assert.equal(app.queries.at(-1).sql, 'COMMIT');
});
test('pipeline reassignment uses stored route ID, ignoring a forged routeId', async () => {
  const app = setup(sql => sql.includes('FROM public.document_category') ? [{category_id: 2}] : sql.startsWith('SELECT r_id') ? [{r_id: 9}] : []);
  const res = await app.request('put /api/process-types/:processId', {params: {processId: '13'}, body: {...pipeline, routeId: 9999}});
  assert.equal(res.code, 200);
  assert.equal(app.queries.find(q => q.sql.startsWith('UPDATE public.route')).params.at(-1), 9);
  assert.deepEqual(app.queries.find(q => q.sql.startsWith('UPDATE public.process_type')).params, ['Test proposal',2,true,'13']);
});
test('invalid category rolls back before creating a route', async () => {
  const app = setup(() => []);
  const res = await app.request('post /api/process-types', {body: pipeline});
  assert.equal(res.code, 400); assert.equal(app.queries.at(-1).sql, 'ROLLBACK');
  assert.ok(!app.queries.some(q => q.sql.startsWith('INSERT')));
});
test('document submission rejects free text and inactive IDs without creating documents', async () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const source = fs.readFileSync(require.resolve('./server'), 'utf8');
  const start = source.indexOf("app.post('/api/documents',");
  const end = source.indexOf('// 6. SMART SCANNER', start);
  let handler;
  const queries = [];
  const pool = {async query(sql) { queries.push(sql); return {rows: sql.includes('SELECT d_id') ? [{d_id: 1}] : []}; }};
  vm.runInNewContext(source.slice(start, end), {app: {post: (path, auth, fn) => { handler = fn; }}, pool, requireAuth() {}, console});
  for (const id of ['Proposal', '', null, 999]) {
    const res = {status(code) { this.code = code; return this; }, json(body) { this.body = body; }};
    await handler({body: {processTypeId: id, userId: 1, title: 'Test'}}, res);
    assert.equal(res.code, 400);
  }
  assert.equal(queries.length, 2);
  assert.match(queries[1], /FROM public.process_type WHERE p_id=\$1 AND is_active IS TRUE/);
});
