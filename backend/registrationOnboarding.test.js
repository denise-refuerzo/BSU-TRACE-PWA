const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');

process.env.JWT_SECRET ||= 'registration-onboarding-test-secret';
const { buildRegistrationToken, parseRegistrationToken } = require('./registrationLinkRoutes');
const registerRegistrationLinkRoutes = require('./registrationLinkRoutes');

function responseRecorder() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

test('registration tokens are signed, verifiable, and reject tampering', () => {
  const publicId = '123e4567-e89b-42d3-a456-426614174000';
  const token = buildRegistrationToken(publicId);
  const parsed = parseRegistrationToken(token);
  assert.equal(parsed.publicId, publicId);
  assert.match(parsed.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(parseRegistrationToken(`${token.slice(0, -1)}x`), null);
  assert.equal(parseRegistrationToken('not-a-token'), null);
});

test('registration onboarding migration adds bounded links, lineage, audit, and request authority', async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE public.account (a_id integer PRIMARY KEY, account_type text NOT NULL);
    CREATE TABLE public.offices (o_id serial PRIMARY KEY, office_name text NOT NULL);
    CREATE TABLE public.department (d_id serial PRIMARY KEY, department_name text NOT NULL);
    CREATE TABLE public."User" (
      u_id serial PRIMARY KEY,public_id uuid DEFAULT gen_random_uuid(),a_id integer NOT NULL REFERENCES public.account(a_id),
      d_id integer,o_id integer,username text,password text,full_name text,uni_email text NOT NULL
    );
    CREATE TABLE public.vehicle_requirements (v_id serial PRIMARY KEY);
    CREATE TABLE public.trace_schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now());
    INSERT INTO public.account VALUES (1,'Faculty Staff'),(2,'Office Staff'),(5,'ICT Admin');
    INSERT INTO public.offices(office_name) VALUES ('Registrar');
    INSERT INTO public.department(department_name) VALUES ('CICS');
    INSERT INTO public."User"(a_id,o_id,username,password,full_name,uni_email) VALUES
      (2,1,'head','hash','Office Head','head@g.batstate-u.edu.ph'),
      (5,NULL,'ict','hash','ICT Admin','ict@g.batstate-u.edu.ph');
  `);
  await db.exec(await fs.readFile(path.join(__dirname, 'migrations', '004_account_access.sql'), 'utf8'));
  const onboardingMigration = await fs.readFile(path.join(__dirname, 'migrations', '008_registration_onboarding.sql'), 'utf8');
  await db.exec(onboardingMigration);
  await db.exec(onboardingMigration);

  await db.exec(`
    INSERT INTO public.account_access_assignments
      (u_id,scope_type,office_id,can_view_submissions,can_request_registration)
    VALUES (1,'office',1,false,true);
    INSERT INTO public.registration_links
      (requested_by,account_type,office_id,requested_max_registrations,requested_expires_at)
    VALUES (1,2,1,10,now() + interval '1 day');
  `);

  const permission = await db.query('SELECT can_request_registration FROM public.account_access_assignments WHERE u_id=1');
  assert.equal(permission.rows[0].can_request_registration, true);
  const request = await db.query('SELECT public_id,status,requested_max_registrations FROM public.registration_links');
  assert.equal(request.rows[0].status, 'pending');
  assert.equal(request.rows[0].requested_max_registrations, 10);
  await assert.rejects(() => db.exec(`
    INSERT INTO public.registration_links
      (requested_by,account_type,office_id,requested_max_registrations,requested_expires_at)
    VALUES (1,1,1,2,now() + interval '1 day')
  `));
  const migration = await db.query("SELECT count(*)::int AS count FROM public.trace_schema_migrations WHERE name='008_registration_onboarding'");
  assert.equal(migration.rows[0].count, 1);
  await db.close();
});

test('public registration atomically consumes the approved link and records its sponsor', async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE public.account (a_id integer PRIMARY KEY, account_type text NOT NULL);
    CREATE TABLE public.offices (o_id serial PRIMARY KEY, office_name text NOT NULL);
    CREATE TABLE public.department (d_id serial PRIMARY KEY, department_name text NOT NULL);
    CREATE TABLE public."User" (
      u_id serial PRIMARY KEY,public_id uuid DEFAULT gen_random_uuid(),a_id integer NOT NULL REFERENCES public.account(a_id),
      d_id integer,o_id integer,username varchar(50),password varchar(255),full_name varchar(100),
      uni_email varchar(100) NOT NULL,faculty_id varchar(50),is_active boolean DEFAULT true
    );
    CREATE TABLE public.vehicle_requirements (v_id serial PRIMARY KEY);
    CREATE TABLE public.trace_schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now());
    INSERT INTO public.account VALUES (1,'Faculty Staff'),(2,'Office Staff'),(5,'ICT Admin');
    INSERT INTO public.offices(office_name) VALUES ('Registrar');
    INSERT INTO public.department(department_name) VALUES ('CICS');
    INSERT INTO public."User"(a_id,o_id,username,password,full_name,uni_email) VALUES
      (2,1,'head','hash','Office Head','head@g.batstate-u.edu.ph'),
      (5,NULL,'ict','hash','ICT Admin','ict@g.batstate-u.edu.ph');
  `);
  await db.exec(await fs.readFile(path.join(__dirname, 'migrations', '004_account_access.sql'), 'utf8'));
  await db.exec(await fs.readFile(path.join(__dirname, 'migrations', '008_registration_onboarding.sql'), 'utf8'));
  const linkId = '123e4567-e89b-42d3-a456-426614174000';
  const token = buildRegistrationToken(linkId);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db.query(`
    INSERT INTO public.registration_links
      (public_id,requested_by,approved_by,account_type,office_id,requested_max_registrations,
       requested_expires_at,max_registrations,expires_at,token_hash,status,approved_at)
    VALUES ($1,1,2,2,1,1,now()+interval '1 day',1,now()+interval '1 day',$2,'active',now())
  `, [linkId, tokenHash]);

  const routes = new Map();
  const emitted = [];
  const io = { to(room) { return { emit(event) { emitted.push([room, event]); } }; } };
  const app = {
    get(pathOrSetting, ...handlers) { if (handlers.length === 0 && pathOrSetting === 'io') return io; routes.set(`GET ${pathOrSetting}`, handlers.at(-1)); },
    post(pathValue, ...handlers) { routes.set(`POST ${pathValue}`, handlers.at(-1)); },
    patch(pathValue, ...handlers) { routes.set(`PATCH ${pathValue}`, handlers.at(-1)); }
  };
  const pool = {
    query: (...args) => db.query(...args),
    async connect() { return { query: (...args) => db.query(...args), release() {} }; }
  };
  registerRegistrationLinkRoutes(app, pool, (_req, _res, next) => next(), {
    request: (_req, _res, next) => next(),
    publicRead: (_req, _res, next) => next(),
    publicWrite: (_req, _res, next) => next()
  });

  const pendingId = '223e4567-e89b-42d3-a456-426614174000';
  await db.query(`
    INSERT INTO public.registration_links
      (public_id,requested_by,account_type,office_id,requested_max_registrations,requested_expires_at)
    VALUES ($1,1,2,1,3,now()+interval '1 day')
  `, [pendingId]);
  const approve = routes.get('PATCH /api/admin/registration-links/:linkId/approve');
  const approvalResponse = responseRecorder();
  await approve({
    params: { linkId: pendingId }, app, user: { u_id: 2, a_id: 5 },
    body: { maxRegistrations: 2, expiresAt: new Date(Date.now() + 3600000).toISOString(), decisionNote: 'Approved in test' }
  }, approvalResponse);
  assert.equal(approvalResponse.statusCode, 200);
  const approved = await db.query('SELECT status,max_registrations,length(token_hash) AS hash_length FROM public.registration_links WHERE public_id=$1', [pendingId]);
  assert.equal(approved.rows[0].status, 'active');
  assert.equal(approved.rows[0].max_registrations, 2);
  assert.equal(approved.rows[0].hash_length, 64);

  const handler = routes.get('POST /api/public/registration-links/:token/register');
  const req = {
    params: { token }, app,
    body: { username: 'newstaff', password: 'Secure-pass-123!', fullName: 'New Staff', email: 'newstaff@g.batstate-u.edu.ph' }
  };
  const first = responseRecorder();
  await handler(req, first);
  assert.equal(first.statusCode, 201);
  const created = await db.query(`
    SELECT u.a_id,u.o_id,origin.link_id,rl.registration_count,rl.status
    FROM public."User" u
    JOIN public.account_registration_origins origin ON origin.u_id=u.u_id
    JOIN public.registration_links rl ON rl.link_id=origin.link_id
    WHERE u.username='newstaff'
  `);
  assert.equal(created.rows[0].a_id, 2);
  assert.equal(created.rows[0].o_id, 1);
  assert.equal(created.rows[0].registration_count, 1);
  assert.equal(created.rows[0].status, 'exhausted');
  assert.ok(emitted.some(([, event]) => event === 'account-registry-updated'));

  const second = responseRecorder();
  await handler({ ...req, body: { ...req.body, username: 'second', email: 'second@g.batstate-u.edu.ph' } }, second);
  assert.equal(second.statusCode, 410);
  await db.close();
});

test('public registration rejects passwords that do not meet every complexity requirement', async () => {
  const routes = new Map();
  const app = {
    get(pathValue, ...handlers) { routes.set(`GET ${pathValue}`, handlers.at(-1)); },
    post(pathValue, ...handlers) { routes.set(`POST ${pathValue}`, handlers.at(-1)); },
    patch(pathValue, ...handlers) { routes.set(`PATCH ${pathValue}`, handlers.at(-1)); }
  };
  registerRegistrationLinkRoutes(app, {}, (_req, _res, next) => next(), {
    request: (_req, _res, next) => next(),
    publicRead: (_req, _res, next) => next(),
    publicWrite: (_req, _res, next) => next()
  });

  const handler = routes.get('POST /api/public/registration-links/:token/register');
  const token = buildRegistrationToken('123e4567-e89b-42d3-a456-426614174000');
  const baseRequest = {
    params: { token },
    body: { username: 'newstaff', fullName: 'New Staff', email: 'newstaff@g.batstate-u.edu.ph' }
  };
  const invalidPasswords = [
    ['Short1!', 'at least 8 characters'],
    ['lowercase1!', 'uppercase letter'],
    ['UPPERCASE1!', 'lowercase letter'],
    ['NoNumber!', 'one number'],
    ['NoSpecial1', 'special character']
  ];

  for (const [password, expectedMessage] of invalidPasswords) {
    const response = responseRecorder();
    await handler({ ...baseRequest, body: { ...baseRequest.body, password } }, response);
    assert.equal(response.statusCode, 400);
    assert.match(response.body.error, new RegExp(expectedMessage, 'i'));
  }
});
