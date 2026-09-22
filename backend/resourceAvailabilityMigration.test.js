const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('resource availability migration adds persistent facility availability', async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE public.asset_details (asd_id integer PRIMARY KEY, asset_name text);
    CREATE TABLE public.trace_schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now());
  `);
  const sql = await fs.readFile(path.join(__dirname, 'migrations', '003_resource_availability.sql'), 'utf8');
  await db.exec(sql);
  await db.exec("INSERT INTO public.asset_details(asd_id,asset_name) VALUES(1,'Room A')");
  const asset = await db.query('SELECT is_active FROM public.asset_details WHERE asd_id=1');
  const migration = await db.query("SELECT count(*)::int AS count FROM public.trace_schema_migrations WHERE name='003_resource_availability'");
  assert.equal(asset.rows[0].is_active, true);
  assert.equal(migration.rows[0].count, 1);
  await db.close();
});
