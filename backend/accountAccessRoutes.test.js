const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { getBookingSignatoryOptions, resolveBookingSignatories } = require('./accountAccessRoutes');

test('booking signatories are selected from eligible people in the chosen office', async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE public.account (a_id integer PRIMARY KEY, account_type text NOT NULL);
    CREATE TABLE public.offices (o_id integer PRIMARY KEY, office_name text);
    CREATE TABLE public.department (d_id integer PRIMARY KEY, department_name text);
    CREATE TABLE public."User" (
      u_id integer PRIMARY KEY, public_id uuid DEFAULT gen_random_uuid(), uni_email varchar(100) NOT NULL,
      a_id integer NOT NULL REFERENCES public.account(a_id), o_id integer, d_id integer,
      full_name text NOT NULL, is_active boolean DEFAULT true
    );
    CREATE TABLE public.vehicle_requirements (v_id integer PRIMARY KEY);
    CREATE TABLE public.trace_schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now());
    INSERT INTO public.account VALUES (1,'Originator'),(2,'Office Staff');
    INSERT INTO public.offices VALUES (10,'Registrar');
    INSERT INTO public.department VALUES (20,'Computing');
  `);
  const migration = await fs.readFile(path.join(__dirname, 'migrations', '004_account_access.sql'), 'utf8');
  await db.exec(migration);
  const multipleMigration = await fs.readFile(path.join(__dirname, 'migrations', '006_multiple_signatories.sql'), 'utf8');
  await db.exec(multipleMigration);
  await db.exec(`
    INSERT INTO public."User"(u_id,uni_email,a_id,o_id,d_id,full_name) VALUES
      (1,'requester@g.batstate-u.edu.ph',1,10,20,'Requesting Staff'),
      (2,'officehead@g.batstate-u.edu.ph',2,10,NULL,'Office Head'),
      (3,'dean@g.batstate-u.edu.ph',2,10,20,'College Dean'),
      (4,'alternate@g.batstate-u.edu.ph',2,10,NULL,'Alternate Signatory');
    INSERT INTO public.account_access_assignments(u_id,scope_type,office_id,can_view_submissions,can_recommend,position_title)
      VALUES (2,'office',10,true,true,'Office Head');
    INSERT INTO public.account_access_assignments(u_id,scope_type,office_id,can_view_submissions,can_recommend,can_approve,position_title)
      VALUES (3,'office',10,true,true,true,'College Dean');
    INSERT INTO public.account_access_assignments(u_id,scope_type,office_id,can_view_submissions,can_recommend,position_title)
      VALUES (4,'office',10,true,true,'Alternate');
  `);
  const options = await getBookingSignatoryOptions(db, 1);
  assert.equal(options.requestedBy.name, 'Requesting Staff');
  assert.equal(options.requestedBy.officeName, 'Registrar');
  assert.deepEqual(options.offices[0].recommenders.map(person => person.name), ['Alternate Signatory', 'College Dean', 'Office Head']);

  const result = await resolveBookingSignatories(db, 1, {
    recommendingApprovalOfficeId: 10,
    recommendingApprovalUserId: 4,
    approvedByOfficeId: 10,
    approvedByUserId: 3
  });
  assert.equal(result.requestedBy.name, 'Requesting Staff');
  assert.equal(result.recommendingApproval.name, 'Alternate Signatory');
  assert.equal(result.approvedBy.name, 'College Dean');
  const invalid = await resolveBookingSignatories(db, 1, {
    recommendingApprovalOfficeId: 10,
    recommendingApprovalUserId: 1
  });
  assert.equal(invalid.recommendingApproval, null);
  await db.close();
});
