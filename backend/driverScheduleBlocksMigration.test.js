const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('driver blocks can be stored without a facility asset', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE public.trace_schema_migrations (name text PRIMARY KEY);
      CREATE TABLE public.asset_details (asd_id integer PRIMARY KEY);
      CREATE TABLE public.resource_drivers (driver_id integer PRIMARY KEY);
      CREATE TABLE public.asset_blackouts (
        block_id integer PRIMARY KEY, asd_id integer NOT NULL REFERENCES public.asset_details(asd_id),
        start_time timestamp NOT NULL, end_time timestamp NOT NULL
      );
      INSERT INTO public.resource_drivers VALUES (4);
    `);
    const sql = await fs.readFile(path.join(__dirname, 'migrations', '010_driver_schedule_blocks.sql'), 'utf8');
    await db.exec(sql);
    await db.exec("INSERT INTO public.asset_blackouts(block_id,driver_id,start_time,end_time) VALUES(1,4,'2026-09-30 09:00','2026-09-30 11:00')");
    const result = await db.query('SELECT asd_id,driver_id FROM public.asset_blackouts WHERE block_id=1');
    assert.equal(result.rows[0].asd_id, null);
    assert.equal(result.rows[0].driver_id, 4);
  } finally { await db.close(); }
});
