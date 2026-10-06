const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('account access migration adds scoped permissions and only enforces university emails for new or changed addresses', async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE public."User" (u_id serial PRIMARY KEY, uni_email varchar(100) NOT NULL, session_token text);
    CREATE TABLE public.offices (o_id serial PRIMARY KEY);
    CREATE TABLE public.department (d_id serial PRIMARY KEY);
    CREATE TABLE public.vehicle_requirements (v_id serial PRIMARY KEY);
    CREATE TABLE public.trace_schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now());
    INSERT INTO public."User"(uni_email) VALUES ('legacy@example.com');
  `);
  const sql = await fs.readFile(path.join(__dirname, 'migrations', '004_account_access.sql'), 'utf8');
  await db.exec(sql);
  await db.exec(`
    INSERT INTO public.offices DEFAULT VALUES;
    INSERT INTO public.department DEFAULT VALUES;
    INSERT INTO public."User"(uni_email) VALUES ('staff@g.batstate-u.edu.ph');
    INSERT INTO public.account_access_assignments(u_id,scope_type,office_id,can_view_submissions)
    VALUES (2,'office',1,true);
  `);
  const assignment = await db.query('SELECT scope_type,can_view_submissions FROM public.account_access_assignments');
  assert.equal(assignment.rows[0].scope_type, 'office');
  assert.equal(assignment.rows[0].can_view_submissions, true);
  await db.exec(`UPDATE public."User" SET session_token = 'legacy-login-is-allowed' WHERE u_id = 1`);
  await assert.rejects(() => db.exec(`UPDATE public."User" SET uni_email = 'still-outside@example.com' WHERE u_id = 1`));
  await assert.rejects(() => db.exec(`INSERT INTO public."User"(uni_email) VALUES ('outside@example.com')`));
  await assert.rejects(() => db.exec(`INSERT INTO public."User"(uni_email) VALUES ('STAFF@g.batstate-u.edu.ph')`));
  await db.close();
});

test('legacy email follow-up migration allows existing accounts to log in unchanged', async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE public."User" (u_id serial PRIMARY KEY, uni_email varchar(100) NOT NULL, session_token text);
    CREATE TABLE public.trace_schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now());
    INSERT INTO public."User"(uni_email) VALUES ('legacy@example.com');
    ALTER TABLE public."User"
      ADD CONSTRAINT user_bsu_email_check CHECK (
        lower(btrim(uni_email)) ~ '^[a-z0-9._%+\\-]+@g\\.batstate-u\\.edu\\.ph$'
      ) NOT VALID;
  `);

  const sql = await fs.readFile(path.join(__dirname, 'migrations', '005_allow_legacy_emails.sql'), 'utf8');
  await db.exec(sql);

  await db.exec(`UPDATE public."User" SET session_token = 'login-is-allowed' WHERE u_id = 1`);
  await assert.rejects(() => db.exec(`UPDATE public."User" SET uni_email = 'outside@example.com' WHERE u_id = 1`));
  await db.exec(`UPDATE public."User" SET uni_email = 'legacy.user@g.batstate-u.edu.ph' WHERE u_id = 1`);

  const migration = await db.query("SELECT count(*)::int AS count FROM public.trace_schema_migrations WHERE name='005_allow_legacy_emails'");
  assert.equal(migration.rows[0].count, 1);
  await db.close();
});

test('signatory and session follow-up migrations allow multiple candidates and add expiry tracking', async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE public."User" (u_id serial PRIMARY KEY, session_token text);
    CREATE TABLE public.offices (o_id serial PRIMARY KEY);
    CREATE TABLE public.department (d_id serial PRIMARY KEY);
    CREATE TABLE public.account_access_assignments (
      assignment_id bigserial PRIMARY KEY,u_id integer,scope_type text,office_id integer,department_id integer,
      can_recommend boolean,is_active boolean
    );
    CREATE UNIQUE INDEX account_access_office_recommender_unique
      ON public.account_access_assignments(office_id) WHERE scope_type='office' AND is_active AND can_recommend;
    CREATE TABLE public.trace_schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now());
  `);
  await db.exec(await fs.readFile(path.join(__dirname, 'migrations', '006_multiple_signatories.sql'), 'utf8'));
  await db.exec(await fs.readFile(path.join(__dirname, 'migrations', '007_session_expiry.sql'), 'utf8'));
  await db.exec(`
    INSERT INTO public.account_access_assignments(u_id,scope_type,office_id,can_recommend,is_active)
    VALUES (1,'office',1,true,true),(2,'office',1,true,true);
  `);
  const columns = await db.query(`SELECT column_name FROM information_schema.columns
    WHERE table_name='User' AND column_name IN ('session_expires_at','last_activity_at') ORDER BY column_name`);
  assert.deepEqual(columns.rows.map(row => row.column_name), ['last_activity_at', 'session_expires_at']);
  await db.close();
});
