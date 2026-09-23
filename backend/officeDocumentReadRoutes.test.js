const test = require('node:test');
const assert = require('node:assert/strict');
const registerOfficeDocumentReads = require('./officeDocumentReadRoutes');

test('personal submissions are limited to the signed-in account', async () => {
  const routes = new Map();
  const app = {
    get(path, _requireAuth, handler) {
      routes.set(path, handler);
    }
  };
  let capturedQuery;
  let capturedParameters;
  const pool = {
    async query(query, parameters) {
      capturedQuery = query;
      capturedParameters = parameters;
      return { rows: [] };
    }
  };

  registerOfficeDocumentReads(app, pool, (_req, _res, next) => next());
  const handler = routes.get('/api/documents/:userId');
  let response;
  await handler(
    { user: { u_id: 42, a_id: 2, o_id: 7 }, params: { userId: 'another-account' } },
    { json(value) { response = value; }, status() { return this; } }
  );

  assert.deepEqual(response, []);
  assert.deepEqual(capturedParameters, [42]);
  assert.match(capturedQuery, /WHERE idoc\.u_id = \$1/);
  assert.doesNotMatch(capturedQuery, /submission_office_id\s*=\s*\$2/);
});
