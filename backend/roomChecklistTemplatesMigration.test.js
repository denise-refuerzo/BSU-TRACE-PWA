const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('existing Room checklist items are copied to each registered room', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE public.trace_schema_migrations(name text PRIMARY KEY);
      CREATE TABLE public.asset_details(asd_id integer PRIMARY KEY,ast_id integer,asset_name text);
      CREATE TABLE public.checklist_templates(template_id serial PRIMARY KEY,booking_type text,item_name text);
      INSERT INTO public.asset_details VALUES (1,1,'Multimedia Room'),(2,1,'Laboratory'),(3,2,'Gymnasium');
      INSERT INTO public.checklist_templates(booking_type,item_name) VALUES ('Room','Approved Request Form'),('Vehicle','Travel Order');
    `);
    const sql = await fs.readFile(path.join(__dirname,'migrations','011_room_checklist_templates.sql'),'utf8');
    await db.exec(sql);
    await db.exec(sql);
    const result = await db.query(`SELECT asd_id,item_name FROM public.checklist_templates
      WHERE booking_type='Room' AND asd_id IS NOT NULL ORDER BY asd_id`);
    assert.deepEqual(result.rows,[
      {asd_id:1,item_name:'Approved Request Form'},
      {asd_id:2,item_name:'Approved Request Form'}
    ]);
    await db.exec("UPDATE public.checklist_templates SET item_name='Room 1 Form' WHERE asd_id=1");
    const room2 = await db.query('SELECT item_name FROM public.checklist_templates WHERE asd_id=2');
    assert.equal(room2.rows[0].item_name,'Approved Request Form');
    await db.exec("INSERT INTO public.asset_details VALUES(4,1,'New Room')");
    const newRoom = await db.query('SELECT item_name FROM public.checklist_templates WHERE asd_id=4');
    assert.equal(newRoom.rows[0].item_name,'Approved Request Form');
  } finally { await db.close(); }
});
