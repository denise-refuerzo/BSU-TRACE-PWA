const test = require('node:test');
const assert = require('node:assert/strict');
const {PGlite} = require('@electric-sql/pglite');
const register = require('./officeWorkflowRoutes');

test('ad hoc routing integrates with receipt, signing, release, corrections and completion', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE TABLE public."User" (u_id integer PRIMARY KEY,public_id text,a_id integer,o_id integer,d_id integer,is_active boolean);
    CREATE TABLE public.offices (o_id integer PRIMARY KEY,office_name text);
    CREATE TABLE public.initial_document (ini_id integer PRIMARY KEY,public_id text,u_id integer,submission_office_id integer,title text,qr_code text,route_snapshot integer[]);
    CREATE TABLE public.processed_document (pd_id serial PRIMARY KEY,public_id text,ini_id integer,s_id integer,current_office_id integer,
      next_office_id integer,time_in timestamp,time_out timestamp,is_adhoc boolean DEFAULT false,adhoc_return_office_id integer,
      is_returned_from_adhoc boolean DEFAULT false);
    CREATE TABLE public.office_action_history (history_id serial PRIMARY KEY,public_id text,ini_id integer,u_id integer,o_id integer,action_type varchar(100),action_timestamp timestamp);
    INSERT INTO public.offices VALUES (1,'Office A'),(2,'Office B'),(3,'Office C'),(4,'Office D'),(8,'Office H');
    INSERT INTO public."User" SELECT o_id,o_id::text,2,o_id,1,true FROM public.offices;
  `);
  const routes = new Map();
  register({get(){},post(path,...handlers){routes.set(path,handlers.at(-1));}},
    {connect:async()=>({query:(...args)=>db.query(...args),release(){}})},()=>{});
  async function call(path,office,body={}) {
    const res={code:200,status(code){this.code=code;return this;},json(body){this.body=body;}};
    await routes.get(path)({user:{u_id:office},params:{iniId:1},body:{iniId:1,...body}},res);
    assert.equal(res.code,200,JSON.stringify(res.body));
    return res.body;
  }
  const receive=office=>call('/api/documents/scan-in',office);
  async function finish(office) {
    await call('/api/office/sign',office);
    return call('/api/documents/scan-out',office);
  }
  const active=async()=> (await db.query('SELECT * FROM public.processed_document WHERE time_out IS NULL AND NOT (is_returned_from_adhoc IS TRUE AND s_id=4) ORDER BY pd_id DESC LIMIT 1')).rows[0];
  async function reset(sequence) {
    await db.exec('TRUNCATE public.processed_document,public.initial_document,public.office_action_history RESTART IDENTITY');
    await db.query("INSERT INTO public.initial_document (ini_id,public_id,u_id,submission_office_id,title,qr_code,route_snapshot) VALUES (1,'1',1,1,'Test','QR-1',$1)",[sequence]);
    await db.query('INSERT INTO public.processed_document (ini_id,s_id,current_office_id,next_office_id) VALUES (1,1,$1,$2)',[sequence[0],sequence[1]]);
    await receive(1);
  }
  async function detour(office) {
    await call('/api/processor/documents/ad-hoc',1,{targetOfficeId:office});
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.office_action_history WHERE o_id=$1 AND action_type='Ad-Hoc Incoming: Office A'",[office])).rows[0].n,1);
    await receive(office);
    await finish(office);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.office_action_history WHERE o_id=1 AND action_type LIKE 'Ad-Hoc Returned:%'")).rows[0].n,1);
    assert.equal((await active()).current_office_id,1);
  }
  await t.test('A → ad hoc C → A → B → D, with no duplicate C processing',async()=>{
    await reset([1,2,3,4]); await detour(3); await finish(1);
    assert.equal((await active()).current_office_id,2);
    assert.equal((await active()).next_office_id,4);
    await receive(2); await finish(2);
    assert.equal((await active()).current_office_id,4);
    await receive(4); assert.match((await finish(4)).message,/completed/);
    assert.equal(await active(),undefined);
    assert.deepEqual((await db.query('SELECT current_office_id FROM public.processed_document ORDER BY pd_id')).rows.map(r=>r.current_office_id),[1,3,2,4]);
  });
  await t.test('a detour satisfying the final stop completes the document at the requesting office',async()=>{
    await reset([1,2]); await detour(2);
    assert.match((await finish(1)).message,/completed/);
    assert.equal(await active(),undefined);
    assert.equal((await db.query('SELECT s_id FROM public.processed_document WHERE pd_id=1')).rows[0].s_id,5);
    assert.equal((await db.query('SELECT s_id FROM public.processed_document ORDER BY pd_id DESC LIMIT 1')).rows[0].s_id,5);
  });
  await t.test('repeated office still requires its later separate visit',async()=>{
    await reset([1,2,2,4]); await detour(2); await finish(1);
    assert.equal((await active()).current_office_id,2);
    await receive(2); await finish(2);
    assert.equal((await active()).current_office_id,4);
  });
  await t.test('off-route detours leave normal routing intact',async()=>{
    await reset([1,2,3]); await detour(8); await finish(1);
    assert.equal((await active()).current_office_id,2);
    await receive(2); await finish(2);
    assert.equal((await active()).current_office_id,3);
  });
  await t.test('an ad hoc correction halts the requesting office without Time Out and resumes after the detour',async()=>{
    await reset([1,2,3]);
    await call('/api/processor/documents/ad-hoc',1,{targetOfficeId:3}); await receive(3);
    await call('/api/office/return',3,{reason:'Correct the title'});
    const halted=(await db.query('SELECT s_id,time_out,is_returned_from_adhoc FROM public.processed_document WHERE pd_id=1')).rows[0];
    assert.equal(halted.s_id,4);
    assert.equal(halted.time_out,null);
    assert.equal(halted.is_returned_from_adhoc,true);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.office_action_history WHERE o_id=1 AND action_type LIKE 'Halted:%'")).rows[0].n,1);
    assert.equal((await db.query("SELECT action_type FROM public.office_action_history WHERE o_id=1 AND action_type LIKE 'Halted:%'")).rows[0].action_type,'Halted: Office C');
    await call('/api/documents/scan-out',3);
    await call('/api/documents/:iniId/resubmit',1,{title:'Corrected'});
    assert.equal((await active()).current_office_id,3);
    await receive(3); await finish(3);
    assert.equal((await active()).current_office_id,2);
    await receive(2); assert.match((await finish(2)).message,/completed/);
    assert.equal(await active(),undefined);
  });
  await t.test('resubmission repairs an earlier ad hoc correction before continuing',async()=>{
    await reset([1,2,3]);
    await call('/api/processor/documents/ad-hoc',1,{targetOfficeId:3});
    await receive(3);
    await call('/api/office/return',3,{reason:'Correct the title'});
    await db.exec('UPDATE public.processed_document SET s_id=2,is_returned_from_adhoc=false,next_office_id=2 WHERE pd_id=1');
    await call('/api/documents/scan-out',3);
    await call('/api/documents/:iniId/resubmit',1,{title:'Corrected'});
    const original=(await db.query('SELECT s_id,time_out,is_returned_from_adhoc FROM public.processed_document WHERE pd_id=1')).rows[0];
    assert.equal(original.s_id,4);
    assert.equal(original.time_out,null);
    assert.equal(original.is_returned_from_adhoc,true);
    await receive(3); await finish(3);
    assert.equal((await active()).current_office_id,2);
  });
});
