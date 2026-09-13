const test=require('node:test');
const assert=require('node:assert/strict');
const register=require('./resourceAdminRoutes');
function setup(replies) {
  const routes=new Map(),queries=[];let index=0;
  const client={async query(sql,values){queries.push({sql,values});if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK'||sql.includes('pg_advisory'))return {rows:[]};const next=replies[index++];if(next instanceof Error)throw next;assert.ok(next,'Unexpected query');return {rows:next};},release(){}};
  const app={};for(const method of ['get','post','put','delete'])app[method]=(path,...handlers)=>routes.set(`${method} ${path}`,handlers);
  register(app,{...client,connect:async()=>client},(req,res,next)=>next());
  return {queries,async call(method,path,body,params={},role=4){const handlers=routes.get(`${method} ${path}`);const req={body,params,user:{a_id:role,u_id:5}};const res={code:200,status(code){this.code=code;return this;},json(data){this.data=data;}};let step=0;const next=()=>handlers[step++]?.(req,res,next);await next();return res;}};
}
test('whole-day blocks end at next midnight and retain individual vehicle id',async()=>{
  const api=setup([[{ast_id:4}],[{}],[],[]]);
  const res=await api.call('post','/api/resources/schedule-blocks',{assetId:3,vehicleId:9,date:'2026-09-30',wholeDay:true,reason:'Maintenance'});
  assert.equal(res.code,201);
  const insert=api.queries.find(q=>q.sql.startsWith('INSERT'));
  assert.deepEqual(insert.values,[3,9,'2026-09-30T00:00','2026-10-01T00:00','Maintenance',5,true]);
});
test('partial facility block saves the exact requested interval',async()=>{
  const api=setup([[{ast_id:1}],[],[]]);
  assert.equal((await api.call('post','/api/resources/schedule-blocks',{assetId:2,date:'2026-09-30',wholeDay:false,start:'09:00',end:'11:00',reason:'Repair'})).code,201);
  const insert=api.queries.find(q=>q.sql.startsWith('INSERT'));
  assert.equal(insert.values[2],'2026-09-30T09:00');assert.equal(insert.values[3],'2026-09-30T11:00');
});
test('a confirmed request prevents creation of an overlapping block',async()=>{
  const api=setup([[{ast_id:1}],[{}]]);
  const res=await api.call('post','/api/resources/schedule-blocks',{assetId:2,date:'2026-09-30',wholeDay:true,reason:'Repair'});
  assert.equal(res.code,400);assert.match(res.data.error,/confirmed request/);assert.equal(api.queries.at(-1).sql,'ROLLBACK');assert.ok(!api.queries.some(q=>q.sql.startsWith('INSERT')));
});
test('vehicle block requires a registered individual vehicle',async()=>{
  const api=setup([[{ast_id:4}],[]]);
  const res=await api.call('post','/api/resources/schedule-blocks',{assetId:3,date:'2026-09-30',wholeDay:true,reason:'Repair'});
  assert.equal(res.code,400);assert.match(res.data.error,/individual registered vehicle/);
});
test('originator cannot write GSO blocks',async()=>{
  const api=setup([]);assert.equal((await api.call('post','/api/resources/schedule-blocks',{}, {},1)).code,403);assert.equal(api.queries.length,0);
});
test('linked driver deletion preserves history and reports the reason',async()=>{
  const api=setup([Object.assign(new Error('foreign key'),{code:'23503'})]);
  const res=await api.call('delete','/api/resources/registry/:kind/:id',{}, {kind:'drivers',id:1});
  assert.equal(res.code,400);assert.match(res.data.error,/kept|history/);assert.equal(api.queries.at(-1).sql,'ROLLBACK');
});
test('frontend block day matching excludes the ending midnight',async()=>{
  const fs=require('node:fs');
  const source=fs.readFileSync(require('node:path').join(__dirname,'../frontend/src/utils/resourceSchedule.js'),'utf8');
  const {blockOnDay,blockMatchesResource}=await import(`data:text/javascript,${encodeURIComponent(source)}`);
  const block={ast_id:4,vehicle_id:9,start_time:'2026-09-30T00:00:00',end_time:'2026-10-01T00:00:00'};
  assert.equal(blockOnDay(block,'2026-09-30'),true);assert.equal(blockOnDay(block,'2026-10-01'),false);assert.equal(blockMatchesResource(block,'Van'),true);assert.equal(blockMatchesResource(block,'Gymnasium'),false);
});
