const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {PGlite} = require('@electric-sql/pglite');

test('public identifier migration backfills records and is idempotent', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE TABLE public."User" (u_id serial PRIMARY KEY);
    CREATE TABLE public.initial_document (ini_id serial PRIMARY KEY);
    CREATE TABLE public.processed_document (pd_id serial PRIMARY KEY);
    CREATE TABLE public.office_action_history (history_id serial PRIMARY KEY);
    CREATE TABLE public.bookings (booking_id serial PRIMARY KEY);
    CREATE TABLE public.booking_checklists (check_id serial PRIMARY KEY);
    CREATE TABLE public.equipment_ledgers (log_id serial PRIMARY KEY);
    CREATE TABLE public.chat_rooms (room_id serial PRIMARY KEY);
    CREATE TABLE public.chat_messages (message_id serial PRIMARY KEY);
    CREATE TABLE public.trace_schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now());
    INSERT INTO public."User" DEFAULT VALUES;
    INSERT INTO public.initial_document DEFAULT VALUES;
    INSERT INTO public.processed_document DEFAULT VALUES;
    INSERT INTO public.office_action_history DEFAULT VALUES;
    INSERT INTO public.bookings DEFAULT VALUES;
    INSERT INTO public.booking_checklists DEFAULT VALUES;
    INSERT INTO public.equipment_ledgers DEFAULT VALUES;
    INSERT INTO public.chat_rooms DEFAULT VALUES;
    INSERT INTO public.chat_messages DEFAULT VALUES;
  `);
  const sql = await fs.readFile(path.join(__dirname, '..', 'migrations', '001_public_ids.sql'), 'utf8');
  await db.exec(sql);
  await db.exec(sql);
  for (const [table, key] of [['"User"','u_id'],['initial_document','ini_id'],['processed_document','pd_id'],
    ['office_action_history','history_id'],['bookings','booking_id'],['booking_checklists','check_id'],
    ['equipment_ledgers','log_id'],['chat_rooms','room_id'],['chat_messages','message_id']]) {
    const result = await db.query(`SELECT public_id FROM public.${table} WHERE ${key}=1`);
    assert.match(String(result.rows[0].public_id), /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  }
  const migrations = await db.query("SELECT count(*)::int AS count FROM public.trace_schema_migrations WHERE name='001_public_ids'");
  assert.equal(migrations.rows[0].count, 1);
});
