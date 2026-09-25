const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const registerRoutes = require('./documentCollaborationRoutes');

test('collaboration migration creates viewer access, personal archives, cancellation, and activity history', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE TABLE public."User" (u_id serial PRIMARY KEY);
    CREATE TABLE public.initial_document (ini_id serial PRIMARY KEY);
    CREATE TABLE public.trace_schema_migrations (name text PRIMARY KEY);
  `);
  const migration = await fs.readFile(path.join(__dirname, 'migrations', '009_document_collaboration.sql'), 'utf8');
  await db.exec(migration);
  const columns = await db.query(`SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='initial_document'`);
  assert.ok(columns.rows.some(row => row.column_name === 'lifecycle_state'));
  assert.equal((await db.query(`SELECT to_regclass('public.document_collaborators') AS table_name`)).rows[0].table_name, 'document_collaborators');
  assert.equal((await db.query(`SELECT to_regclass('public.document_user_archives') AS table_name`)).rows[0].table_name, 'document_user_archives');
  assert.equal((await db.query(`SELECT to_regclass('public.document_activity_history') AS table_name`)).rows[0].table_name, 'document_activity_history');
});

test('only the original submitter can stop processing while a collaborator may archive their own view', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE TABLE public."User" (u_id integer PRIMARY KEY,public_id text,full_name text,uni_email text,a_id integer,is_active boolean,d_id integer,o_id integer);
    CREATE TABLE public.department (d_id integer PRIMARY KEY,department_name text);
    CREATE TABLE public.offices (o_id integer PRIMARY KEY,office_name text);
    CREATE TABLE public.initial_document (ini_id integer PRIMARY KEY,public_id text,u_id integer,lifecycle_state text,cancelled_at timestamptz,cancelled_by integer,cancellation_reason text,submission_office_id integer);
    CREATE TABLE public.processed_document (pd_id serial PRIMARY KEY,ini_id integer,s_id integer,current_office_id integer,next_office_id integer,time_out timestamp);
    CREATE TABLE public.document_collaborators (collaborator_id serial PRIMARY KEY,ini_id integer,user_id integer,added_by integer,UNIQUE(ini_id,user_id));
    CREATE TABLE public.document_user_archives (archive_id serial PRIMARY KEY,ini_id integer,user_id integer,archived_at timestamptz DEFAULT now(),UNIQUE(ini_id,user_id));
    CREATE TABLE public.document_activity_history (activity_id serial PRIMARY KEY,public_id uuid,ini_id integer,actor_user_id integer,activity_type text,details jsonb,created_at timestamptz DEFAULT now());
    INSERT INTO public."User" VALUES
      (1,'owner','Owner','owner@g.batstate-u.edu.ph',2,true,8,3),
      (2,'viewer','Viewer','viewer@g.batstate-u.edu.ph',1,true,8,3),
      (3,'candidate-3','Candidate Three','three@g.batstate-u.edu.ph',1,true,8,3),
      (4,'candidate-4','Candidate Four','four@g.batstate-u.edu.ph',2,true,8,3);
    INSERT INTO public.department VALUES (8,'Academic Affairs');
    INSERT INTO public.offices VALUES (3,'External Affairs');
    INSERT INTO public.initial_document VALUES (10,'doc-10',1,'active',NULL,NULL,NULL,3);
    INSERT INTO public.processed_document(ini_id,s_id,current_office_id,next_office_id) VALUES (10,1,3,4);
    INSERT INTO public.document_collaborators(ini_id,user_id,added_by) VALUES (10,2,1);
  `);
  const routes = new Map();
  const app = {
    get(path, _auth, handler) { routes.set(`GET ${path}`, handler); },
    post(path, _auth, handler) { routes.set(`POST ${path}`, handler); },
    delete(path, _auth, handler) { routes.set(`DELETE ${path}`, handler); }
  };
  const pool = { query: (...args) => db.query(...args), connect: async () => ({ query: (...args) => db.query(...args), release() {} }) };
  registerRoutes(app, pool, () => {});
  const call = async (key, user, params, body = {}, query = {}) => {
    const response = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; } };
    const req = { user, params, body, query, app: { get: () => ({ to: () => ({ emit() {} }) }) } };
    await routes.get(key)(req, response);
    return response;
  };

  const officeCandidates = await call('GET /api/collaboration/documents/:iniId/candidates', { u_id: 1, public_id: 'owner' }, { iniId: 'doc-10' }, {}, { scope: 'office' });
  assert.deepEqual(officeCandidates.body.candidates.map(candidate => candidate.user_id), ['candidate-4', 'candidate-3']);

  const bulkAdded = await call('POST /api/collaboration/documents/:iniId/collaborators', { u_id: 1, public_id: 'owner' }, { iniId: 'doc-10' }, { userIds: ['candidate-3', 'candidate-4'] });
  assert.equal(bulkAdded.code, 201);
  assert.equal(bulkAdded.body.added.length, 2);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.document_collaborators WHERE ini_id=10')).rows[0].count, 3);

  const context = await call('GET /api/collaboration/documents/:iniId/candidates', { u_id: 1, public_id: 'owner' }, { iniId: 'doc-10' }, {}, { scope: 'context' });
  assert.equal(context.body.isOfficeSubmission, true);
  assert.deepEqual(context.body.scopes.map(scope => scope.id), ['office', 'department']);

  const denied = await call('POST /api/collaboration/documents/:iniId/cancel', { u_id: 2, public_id: 'viewer' }, { iniId: 'doc-10' }, { reason: 'Wrong document uploaded' });
  assert.equal(denied.code, 404);
  assert.equal((await db.query('SELECT lifecycle_state FROM public.initial_document WHERE ini_id=10')).rows[0].lifecycle_state, 'active');

  const cancelled = await call('POST /api/collaboration/documents/:iniId/cancel', { u_id: 1, public_id: 'owner' }, { iniId: 'doc-10' }, { reason: 'Wrong document uploaded' });
  assert.equal(cancelled.code, 200);
  assert.equal((await db.query('SELECT lifecycle_state FROM public.initial_document WHERE ini_id=10')).rows[0].lifecycle_state, 'cancelled');
  assert.ok((await db.query('SELECT time_out FROM public.processed_document WHERE ini_id=10')).rows[0].time_out);

  const archived = await call('POST /api/collaboration/documents/:iniId/archive', { u_id: 2, public_id: 'viewer' }, { iniId: 'doc-10' });
  assert.equal(archived.code, 200);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.document_user_archives WHERE user_id=2')).rows[0].count, 1);
});

test('unified history returns submission, access, office, and chat activity with relationship labels', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE TABLE public."User" (u_id integer PRIMARY KEY,full_name text);
    CREATE TABLE public.initial_document (ini_id integer PRIMARY KEY,public_id text,title text,qr_code text,u_id integer);
    CREATE TABLE public.document_collaborators (ini_id integer,user_id integer);
    CREATE TABLE public.office_action_history (public_id text,ini_id integer,u_id integer,o_id integer,action_type text,action_timestamp timestamptz,legacy_manila_wall_time boolean);
    CREATE TABLE public.document_activity_history (public_id text,ini_id integer,actor_user_id integer,activity_type text,details jsonb,created_at timestamptz);
    CREATE TABLE public.offices (o_id integer PRIMARY KEY,office_name text);
    CREATE TABLE public.chat_rooms (room_id integer PRIMARY KEY,ini_id integer,o_id integer);
    CREATE TABLE public.chat_messages (public_id text,room_id integer,sender_id integer,sent_at timestamptz);
    INSERT INTO public."User" VALUES (1,'Owner'),(2,'Collaborator'),(3,'Processor');
    INSERT INTO public.initial_document VALUES (10,'doc-10','Proposal','TRK-10',1);
    INSERT INTO public.document_collaborators VALUES (10,2);
    INSERT INTO public.offices VALUES (7,'Records Office');
    INSERT INTO public.office_action_history VALUES ('office-event',10,3,7,'Document received',now(),false);
    INSERT INTO public.document_activity_history VALUES ('access-event',10,1,'Collaborator added','{"collaboratorName":"Collaborator"}',now());
    INSERT INTO public.chat_rooms VALUES (5,10,7);
    INSERT INTO public.chat_messages VALUES ('chat-event',5,2,now());
  `);
  const routes = new Map();
  const app = {
    get(path, _auth, handler) { routes.set(`GET ${path}`, handler); },
    post() {},
    delete() {}
  };
  const pool = { query: (...args) => db.query(...args) };
  registerRoutes(app, pool, () => {});
  const response = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; } };
  await routes.get('GET /api/collaboration/history')({ user: { u_id: 2, o_id: null } }, response);
  assert.equal(response.code, 200);
  assert.deepEqual(new Set(response.body.map(event => event.event_category)), new Set(['submission', 'access', 'chat']));
  assert.ok(response.body.every(event => event.relationship_label === 'Collaborator'));
});
