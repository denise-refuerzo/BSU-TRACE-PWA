const test = require('node:test');
const assert = require('node:assert/strict');
const {PGlite} = require('@electric-sql/pglite');
const registerCategories = require('./documentCategoryRoutes');
const {resolveTemplateRoute} = require('./officeWorkflow');
const {syncOfficeRouteGroup} = require('./officeRouteGroups');

test('submission route keys wait for every step and retain independent choices', async () => {
  const {getWorkflowStops,getSelectedRouteKey} = await import('../frontend/src/utils/workflowRoute.js');
  const workflow={stop_1:1,stop_1_group_id:5,stop_1_label:'Prepared by',stop_2:1,stop_2_group_id:5,stop_2_label:'Reviewed by',stop_3:999,resolved_route_ids:[null,null,11]};
  assert.equal(getSelectedRouteKey(getWorkflowStops(workflow,{stop_1:4})), '');
  const stops=getWorkflowStops(workflow,{stop_1:4,stop_2:2});
  assert.equal(getSelectedRouteKey(stops),'4,2,11');
  assert.deepEqual(stops.slice(0,2).map(stop=>stop.label),['Prepared by','Reviewed by']);
  assert.equal(getSelectedRouteKey(getWorkflowStops(workflow,{stop_1:3,stop_2:2})),'3,2,11');
});

test('labeled workflow steps save, resolve independently, and retain their document routes', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  const positions = Array.from({length: 7}, (_, i) => i + 1);
  await db.exec(`
    CREATE TABLE public.offices (o_id integer PRIMARY KEY,office_name text,office_category text);
    CREATE TABLE public.office_route_groups (group_id serial PRIMARY KEY,group_name varchar(150) UNIQUE,description text,is_active boolean DEFAULT true);
    CREATE TABLE public.office_route_group_members (group_id integer REFERENCES public.office_route_groups ON DELETE CASCADE,office_id integer REFERENCES public.offices,PRIMARY KEY(group_id,office_id));
    CREATE TABLE public.document_category (category_id serial PRIMARY KEY,category_name text,description text DEFAULT '');
    CREATE TABLE public.route (r_id serial PRIMARY KEY,${positions.map(i => `stop_${i} integer REFERENCES public.offices${i < 3 ? ' NOT NULL' : ''},stop_${i}_group_id integer REFERENCES public.office_route_groups,stop_${i}_label varchar(150)`).join(',')});
    CREATE TABLE public.process_type (p_id serial PRIMARY KEY,r_id integer REFERENCES public.route,process_name text,is_active boolean,category_id integer REFERENCES public.document_category,route_status text DEFAULT 'official');
    CREATE TABLE public."User" (u_id integer PRIMARY KEY,public_id text,a_id integer,o_id integer,d_id integer,is_active boolean);
    CREATE TABLE public.initial_document (ini_id serial PRIMARY KEY,public_id text DEFAULT 'document',p_id integer,u_id integer,title text,edc date,qr_code text,created_at timestamp,submission_office_id integer,route_snapshot integer[]);
    CREATE TABLE public.processed_document (pd_id serial PRIMARY KEY,ini_id integer,s_id integer,current_office_id integer,next_office_id integer,time_in timestamp,time_out timestamp);
    CREATE TABLE public.office_action_history (ini_id integer,u_id integer,o_id integer,action_type text,action_timestamp timestamp);
    INSERT INTO public.offices VALUES (1,'College A','Colleges'),(2,'College B','Colleges'),(3,'Finance','Administration'),(4,'Health',NULL),(999,'Legacy placeholder',NULL);
    INSERT INTO public.office_route_groups (group_name) VALUES ('All offices'),('Colleges'),('Administration');
    INSERT INTO public.office_route_group_members VALUES (2,1),(2,2),(3,3);
    INSERT INTO public.document_category (category_name) VALUES ('General');
    INSERT INTO public."User" VALUES (1,'originator',1,NULL,1,true),(2,'processor',2,4,NULL,true);
  `);
  const routes = new Map();
  const app = Object.fromEntries(['get','post','put','delete'].map(method => [method,(path,...handlers)=>routes.set(`${method} ${path}`,handlers)]));
  const pool = {query:(...args)=>db.query(...args),connect:async()=>({query:(...args)=>db.query(...args),release(){}})};
  const auth = (req,res,next)=>next();
  registerCategories(app,pool,auth);
  require('./officeWorkflowRoutes')(app,pool,auth);
  async function call(method,path,body={},params={},user={a_id:5,u_id:1}) {
    const req = {body,params,user,query:{}};
    const res = {code:200,status(code){this.code=code;return this;},json(body){this.body=body;}};
    let index=0;
    const handlers=routes.get(`${method} ${path}`);
    const next=async()=>{if(index<handlers.length)await handlers[index++](req,res,next);};
    await next();
    return res;
  }
  const payload={processName:'Flexible request',categoryId:1,stops:[{type:'group',groupId:1,label:'  Prepared by  '},{type:'group',groupId:1,label:'Reviewed by'},3]};
  let workflow;
  await t.test('same category accepts independent labels and reads them back',async()=>{
    const created=await call('post','/api/process-types',payload);
    assert.equal(created.code,201,JSON.stringify(created.body));
    workflow=(await call('get','/api/process-types')).body[0];
    assert.equal(workflow.stop_1_label,'Prepared by');
    assert.equal(workflow.stop_2_label,'Reviewed by');
    assert.equal(workflow.stop_3_label,null);
    assert.equal(workflow.resolved_origin_office_id,null);
    assert.deepEqual(workflow.resolved_route_ids,[null,null,3]);
    assert.deepEqual(workflow.resolved_route_names,['Prepared by','Reviewed by','Finance']);
  });
  await t.test('all offices includes uncategorized and newly created offices without membership rows',async()=>{
    await db.exec("INSERT INTO public.offices VALUES (5,'New office',NULL)");
    const groups=(await call('get','/api/office-route-groups')).body;
    assert.deepEqual(groups.find(g=>g.group_id===1).offices.map(o=>o.id).sort(),[1,2,3,4,5]);
    assert.deepEqual(groups.find(g=>g.group_id===2).offices.map(o=>o.id),[1,2]);
    assert.deepEqual(await resolveTemplateRoute(db,workflow,{}, {stop_1:4,stop_2:5}),[4,5,3]);
  });
  await t.test('category choices reject missing, invalid, outside, and inactive selections',async()=>{
    for(const selections of [null,[],{stop_1:4},{1:4},{stop_1:999,stop_2:2},{stop_1:99999,stop_2:2},{stop_1:1.5,stop_2:2}])
      await assert.rejects(()=>resolveTemplateRoute(db,workflow,{},selections),{status:400});
    const restricted={stop_1:1,stop_1_group_id:2,stop_1_label:'College Dean',stop_2:3};
    await assert.rejects(()=>resolveTemplateRoute(db,restricted,{}, {stop_1:4}),{status:400});
    assert.deepEqual(await resolveTemplateRoute(db,restricted,{}, {stop_1:2}),[2,3]);
    assert.deepEqual(await resolveTemplateRoute(db,restricted,{}, {2:1}),[1,3]);
    await db.exec('UPDATE public.office_route_groups SET is_active=false WHERE group_id=2');
    await assert.rejects(()=>resolveTemplateRoute(db,restricted,{}, {stop_1:2}),{status:400});
    await db.exec('UPDATE public.office_route_groups SET is_active=true WHERE group_id=2');
  });
  await t.test('originators and office staff submit their chosen offices into route snapshots',async()=>{
    for(const [user,selections,complete] of [[{u_id:1,a_id:1},{stop_1:1,stop_2:2},false],[{u_id:2,a_id:2},{stop_1:4,stop_2:5},true]]) {
      const res=await call('post','/api/documents',{processTypeId:workflow.p_id,title:'Labeled document',edc:'2026-10-20',placeholderSelections:selections,completeOriginProcessing:complete},{},user);
      assert.equal(res.code,201,JSON.stringify(res.body));
    }
    const docs=(await db.query('SELECT route_snapshot FROM public.initial_document ORDER BY ini_id')).rows;
    assert.deepEqual(docs.map(d=>d.route_snapshot),[[1,2,3],[4,5,3]]);
    const active=(await db.query('SELECT current_office_id FROM public.processed_document WHERE ini_id=2 AND time_out IS NULL')).rows;
    assert.equal(active[0].current_office_id,5);
  });
  await t.test('edits retain labels, clear labels on fixed steps, and preserve existing document snapshots',async()=>{
    const changed={...payload,stops:[{type:'group',groupId:2,label:'College Dean'},2,3]};
    const res=await call('put','/api/process-types/:processId',changed,{processId:workflow.p_id});
    assert.equal(res.code,200,JSON.stringify(res.body));
    const updated=(await call('get','/api/process-types')).body[0];
    assert.equal(updated.stop_1_label,'College Dean');
    assert.equal(updated.stop_2_label,null);
    assert.equal(updated.stop_2_group_id,null);
    assert.deepEqual((await db.query('SELECT route_snapshot FROM public.initial_document ORDER BY ini_id')).rows.map(d=>d.route_snapshot),[[1,2,3],[4,5,3]]);
  });
  await t.test('category steps require nonempty labels of at most 150 characters',async()=>{
    for(const label of [undefined,null,'   ','x'.repeat(151),42]) {
      const res=await call('post','/api/process-types',{...payload,stops:[{type:'group',groupId:1,label},3]});
      assert.equal(res.code,400);
    }
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.process_type')).rows[0].count,1);
  });
  await t.test('ICT manages overlapping office categories',async()=>{
    assert.equal((await call('post','/api/admin/office-route-groups',{groupName:'Blocked',officeIds:[1]},{},{a_id:2,u_id:2})).code,403);
    let result=await call('post','/api/admin/office-route-groups',{groupName:'Approval Offices',description:'Reviewers',officeIds:[1,3]});
    assert.equal(result.code,201,JSON.stringify(result.body));
    const groupId=result.body.groupId;
    const adminGroups=(await call('get','/api/admin/office-route-groups')).body;
    assert.deepEqual(adminGroups.find(group=>group.group_id===groupId).offices.map(office=>office.id),[1,3]);
    assert.equal(adminGroups.find(group=>group.group_id===2).workflow_count,1);
    assert.equal((await call('post','/api/admin/office-route-groups',{groupName:' approval offices ',officeIds:[2]})).code,409);
    assert.equal((await call('post','/api/admin/office-route-groups',{groupName:'All offices',officeIds:[2]})).code,400);
    assert.equal((await call('post','/api/admin/office-route-groups',{groupName:'Unknown',officeIds:[999]})).code,400);
    result=await call('put','/api/admin/office-route-groups/:groupId',{groupName:'Approval Offices',description:'Expanded',officeIds:[2,3]},{groupId});
    assert.equal(result.code,200,JSON.stringify(result.body));
    assert.deepEqual((await db.query('SELECT office_id FROM public.office_route_group_members WHERE group_id=$1 ORDER BY office_id',[groupId])).rows.map(row=>row.office_id),[2,3]);
    assert.equal((await call('put','/api/admin/office-route-groups/:groupId',{groupName:'Colleges',officeIds:[1]},{groupId:2})).code,400);
    assert.equal((await call('put','/api/admin/office-route-groups/:groupId',{groupName:'Edited',officeIds:[1]},{groupId:1})).code,400);
    assert.equal((await call('delete','/api/admin/office-route-groups/:groupId',{},{groupId:2})).code,409);
    assert.equal((await call('delete','/api/admin/office-route-groups/:groupId',{},{groupId:1})).code,400);
    await syncOfficeRouteGroup(db,2,'Administration','Colleges');
    assert.deepEqual((await db.query('SELECT group_id FROM public.office_route_group_members WHERE office_id=2 ORDER BY group_id')).rows.map(row=>row.group_id),[1,3,groupId]);
    assert.equal((await call('delete','/api/admin/office-route-groups/:groupId',{},{groupId})).code,200);
    assert.equal((await db.query('SELECT 1 FROM public.office_route_groups WHERE group_id=$1',[groupId])).rowCount,0);
  });
  await t.test('office edits preserve custom routing categories',async()=>{
    const created=await call('post','/api/admin/office-route-groups',{groupName:'Shared approval',officeIds:[1]});
    assert.equal(created.code,201,JSON.stringify(created.body));
    const groupId=created.body.groupId;
    await syncOfficeRouteGroup(db,1,'Administration','Colleges');
    assert.deepEqual((await db.query('SELECT group_id FROM public.office_route_group_members WHERE office_id=1 ORDER BY group_id')).rows.map(r=>r.group_id),[1,3,groupId]);
    await syncOfficeRouteGroup(db,1,null,'Administration');
    assert.deepEqual((await db.query('SELECT group_id FROM public.office_route_group_members WHERE office_id=1 ORDER BY group_id')).rows.map(r=>r.group_id),[1,groupId]);
    await syncOfficeRouteGroup(db,5,null);
    assert.equal((await db.query('SELECT 1 FROM public.office_route_group_members WHERE office_id=5 AND group_id=1')).rows.length,1);
  });
});
