const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('booking workflow migration adds operational statuses and update history', async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE public."User" (u_id integer PRIMARY KEY);
    CREATE TABLE public.bookings (
      booking_id integer PRIMARY KEY,
      u_id integer,
      status character varying(20),
      CONSTRAINT bookings_status_check CHECK (status IN ('Reserved','Confirmed'))
    );
    CREATE TABLE public.trace_schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz DEFAULT now()
    );
  `);
  const sql = await fs.readFile(path.join(__dirname, 'migrations', '002_booking_workflow.sql'), 'utf8');
  await db.exec(sql);
  await db.exec("INSERT INTO public.bookings(booking_id,status) VALUES(1,'Delayed')");
  await db.exec("INSERT INTO public.booking_status_updates(booking_id,previous_status,new_status,notification_message) VALUES(1,'Approved','Delayed','Updated')");
  const migration = await db.query("SELECT count(*)::int AS count FROM public.trace_schema_migrations WHERE name='002_booking_workflow'");
  const updates = await db.query('SELECT count(*)::int AS count FROM public.booking_status_updates');
  assert.equal(migration.rows[0].count, 1);
  assert.equal(updates.rows[0].count, 1);
  await db.close();
});
