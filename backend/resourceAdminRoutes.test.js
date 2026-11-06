const test=require('node:test');
const assert=require('node:assert/strict');
const register=require('./resourceAdminRoutes');
function setup(replies, emailResult={success:true}) {
  const routes=new Map(),queries=[],emails=[];let index=0;
  const client={async query(sql,values){queries.push({sql,values});if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK'||sql.includes('pg_advisory'))return {rows:[]};const next=replies[index++];if(next instanceof Error)throw next;assert.ok(next,'Unexpected query');return {rows:next};},release(){}};
  const app={};for(const method of ['get','post','put','delete'])app[method]=(path,...handlers)=>routes.set(`${method} ${path}`,handlers);
  register(app,{...client,connect:async()=>client},(req,res,next)=>next(),async(...args)=>{emails.push(args);return emailResult;});
  return {queries,emails,async call(method,path,body,params={},role=4){const handlers=routes.get(`${method} ${path}`);const req={body,params,user:{a_id:role,u_id:5}};const res={code:200,status(code){this.code=code;return this;},json(data){this.data=data;}};let step=0;const next=()=>handlers[step++]?.(req,res,next);await next();return res;}};
}
test('whole-day blocks end at next midnight and retain individual vehicle id',async()=>{
  const api=setup([[{ast_id:4}],[{}],[],[]]);
  const res=await api.call('post','/api/resources/schedule-blocks',{assetId:3,vehicleId:9,date:'2026-09-30',wholeDay:true,reason:'Maintenance'});
  assert.equal(res.code,201);
  const insert=api.queries.find(q=>q.sql.startsWith('INSERT'));
  assert.deepEqual(insert.values,[3,9,null,'2026-09-30T00:00','2026-10-01T00:00','Maintenance',5,true]);
});
test('driver block targets one driver and checks approved trips',async()=>{
  const api=setup([[{}],[],[]]);
  const res=await api.call('post','/api/resources/schedule-blocks',{driverId:4,date:'2026-09-30',wholeDay:true,reason:'Leave'});
  assert.equal(res.code,201);
  const insert=api.queries.find(q=>q.sql.startsWith('INSERT'));
  assert.deepEqual(insert.values.slice(0,3),[null,null,4]);
  assert.match(api.queries.find(q=>q.sql.includes('SELECT count(*)::int AS count')).sql,/assigned_driver_id=\$5/);
});
test('partial facility block saves the exact requested interval',async()=>{
  const api=setup([[{ast_id:1,asset_name:'Room A'}],[],[],[]]);
  assert.equal((await api.call('post','/api/resources/schedule-blocks',{assetId:2,date:'2026-09-30',wholeDay:false,start:'09:00',end:'11:00',reason:'Repair'})).code,201);
  const insert=api.queries.find(q=>q.sql.startsWith('INSERT'));
  assert.equal(insert.values[3],'2026-09-30T09:00');assert.equal(insert.values[4],'2026-09-30T11:00');
});
test('blocking a room cancels overlapping pending requests and emails the block reason',async()=>{
  const pending={booking_id:7,public_id:'request-7',purpose:'Meeting',status:'Pending',uni_email:'user@example.edu',date:'2026-09-30',start:'09:00',end:'11:00'};
  const api=setup([[{ast_id:1,asset_name:'Room A'}],[],[],[pending],[],[]]);
  const res=await api.call('post','/api/resources/schedule-blocks',{assetId:2,date:'2026-09-30',wholeDay:false,start:'09:30',end:'10:30',reason:'Repairs'});
  assert.equal(res.code,201);
  assert.equal(api.emails.length,1);
  assert.match(api.emails[0][1].reason,/Room A.*Repairs/);
  assert.ok(api.queries.some(query=>query.sql.includes("SET status='Cancelled'")));
});
test('an approved active request prevents creation of an overlapping block',async()=>{
  const api=setup([[{ast_id:1}],[{count:2}]]);
  const res=await api.call('post','/api/resources/schedule-blocks',{assetId:2,date:'2026-09-30',wholeDay:true,reason:'Repair'});
  assert.equal(res.code,400);assert.match(res.data.error,/2 approved active requests/);assert.doesNotMatch(res.data.error,/public_id|[0-9a-f]{8}-/i);assert.equal(api.queries.at(-1).sql,'ROLLBACK');assert.ok(!api.queries.some(q=>q.sql.startsWith('INSERT')));
});
test('vehicle block requires a registered individual vehicle',async()=>{
  const api=setup([[{ast_id:4}],[]]);
  const res=await api.call('post','/api/resources/schedule-blocks',{assetId:3,date:'2026-09-30',wholeDay:true,reason:'Repair'});
  assert.equal(res.code,400);assert.match(res.data.error,/individual registered vehicle/);
});
test('originator cannot write GSO blocks',async()=>{
  const api=setup([]);assert.equal((await api.call('post','/api/resources/schedule-blocks',{}, {},1)).code,403);assert.equal(api.queries.length,0);
});
test('GSO can toggle a room or facility availability',async()=>{
  const api=setup([[],[{asset_name:'Multimedia Room'}]]);
  const res=await api.call('put','/api/resources/registry/assets/:id/active',{active:false},{id:2});
  assert.equal(res.code,200);assert.match(res.data.message,/marked unavailable/);
  assert.deepEqual(api.queries.find(query=>query.sql.startsWith('UPDATE public.asset_details')).values,[false,2]);
});
test('unavailable facility notice reports the number of approved requests without an ID',async()=>{
  const api=setup([[{count:3}]]);
  const res=await api.call('put','/api/resources/registry/assets/:id/active',{active:false},{id:2});
  assert.equal(res.code,400);
  assert.match(res.data.error,/3 upcoming approved requests/);
  assert.doesNotMatch(res.data.error,/[0-9a-f]{8}-/i);
  assert.ok(!api.queries.some(query=>query.sql.startsWith('UPDATE public.asset_details')));
});
test('linked driver deletion preserves history and reports the reason',async()=>{
  const api=setup([Object.assign(new Error('foreign key'),{code:'23503'})]);
  const res=await api.call('delete','/api/resources/registry/:kind/:id',{}, {kind:'drivers',id:1});
  assert.equal(res.code,400);assert.match(res.data.error,/kept|history/);assert.equal(api.queries.at(-1).sql,'ROLLBACK');
});
test('approved multimedia room and gym requests appear in Manage Bookings',async()=>{
  const api=setup([[{booking_id:'room',booking_type:'Room',status:'Approved'},{booking_id:'gym',booking_type:'Gymnasium',status:'Confirmed'}]]);
  const res=await api.call('get','/api/resources/manage-bookings',{});
  assert.deepEqual(res.data.map(row=>row.booking_id),['room','gym']);
  assert.deepEqual(res.data.map(row=>row.status),['Approved','Approved']);
  assert.match(api.queries[0].sql,/b\.booking_type IN \('Vehicle','Room','Gymnasium'\)/);
});
test('GSO can complete a gym booking and email its requester',async()=>{
  const api=setup([[{booking_id:7,booking_type:'Gymnasium',status:'Approved',purpose:'Tournament',requestor_email:'user@example.edu',reservation_date:'2026-10-01',start_time:'09:00',end_time:'11:00'}],[],[]]);
  const res=await api.call('put','/api/resources/manage-bookings/:id',{status:'Completed'},{id:'gym'});
  assert.equal(res.code,200);
  assert.equal(api.queries.find(query=>query.sql.startsWith('UPDATE public.bookings SET status=' )).values[0],'Completed');
  assert.equal(api.queries.find(query=>query.sql.includes('INSERT INTO public.booking_status_updates')).values[2],'Completed');
  assert.equal(api.emails[0][0],'user@example.edu');
  assert.equal(api.emails[0][1].status,'Completed');
  assert.match(api.emails[0][1].message,/Tournament.*completed/);
  assert.equal(res.data.emailSent,true);
});
test('GSO can reschedule an approved multimedia room and save its new end time',async()=>{
  const room={booking_id:8,booking_type:'Room',status:'Approved',purpose:'Seminar',asset_name:'Multimedia Room',requestor_email:'room@example.edu',reservation_date:'2026-10-01',start_time:'09:00',end_time:'11:00'};
  const api=setup([[room],[{asd_id:2,is_active:true}],[],[],[],[],[]]);
  const res=await api.call('put','/api/resources/manage-bookings/:id',
    {status:'Rescheduled',reason:'Venue maintenance',date:'2026-10-03',start:'13:00',end:'15:00'},{id:'room'});
  assert.equal(res.code,200);
  assert.deepEqual(api.queries.find(query=>query.sql.startsWith('UPDATE public.gm_requirements')).values,['13:00','15:00',8]);
  const history=api.queries.find(query=>query.sql.includes('INSERT INTO public.booking_status_updates'));
  assert.deepEqual(history.values.slice(5),['2026-10-01','2026-10-03','09:00','13:00','11:00','15:00',5]);
  assert.match(api.emails[0][1].message,/rescheduled to 2026-10-03/);
});
test('manual cancellation emails the requester',async()=>{
  const room={booking_id:9,booking_type:'Room',status:'Approved',purpose:'Workshop',requestor_email:'room@example.edu',reservation_date:'2026-10-01',start_time:'09:00',end_time:'11:00'};
  const api=setup([[room],[],[]]);
  const res=await api.call('put','/api/resources/manage-bookings/:id',{status:'Cancelled',reason:'Maintenance'},{id:'room'});
  assert.equal(res.data.emailSent,true);
  assert.equal(api.emails[0][1].status,'Cancelled');
  assert.equal(api.emails[0][1].reason,'Maintenance');
});
test('delay emails the revised schedule and reason',async()=>{
  const room={booking_id:10,booking_type:'Room',status:'Approved',purpose:'Workshop',asset_name:'Multimedia Room',facility_id:2,requestor_email:'room@example.edu',reservation_date:'2026-10-01',start_time:'09:00',end_time:'11:00'};
  const api=setup([[room],[{asd_id:2,is_active:true}],[],[],[],[],[],[]]);
  const res=await api.call('put','/api/resources/manage-bookings/:id',
    {status:'Delayed',reason:'Technical issue',start:'10:00',end:'12:00'},{id:'room'});
  assert.equal(res.data.emailSent,true);
  assert.equal(api.emails[0][1].status,'Delayed');
  assert.equal(api.emails[0][1].end,'12:00');
  assert.equal(api.emails[0][1].reason,'Technical issue');
});
test('failed email delivery is reported without undoing the booking update',async()=>{
  const room={booking_id:9,booking_type:'Room',status:'Approved',purpose:'Workshop',requestor_email:'room@example.edu',reservation_date:'2026-10-01',start_time:'09:00',end_time:'11:00'};
  const api=setup([[room],[],[]],{success:false});
  const res=await api.call('put','/api/resources/manage-bookings/:id',{status:'Cancelled',reason:'Maintenance'},{id:'room'});
  assert.equal(res.data.emailSent,false);
  assert.match(res.data.message,/could not be sent/);
  assert.ok(api.queries.some(query=>query.sql==='COMMIT'));
});
test('frontend block day matching excludes the ending midnight',async()=>{
  const fs=require('node:fs');
  const source=fs.readFileSync(require('node:path').join(__dirname,'../frontend/src/utils/resourceSchedule.js'),'utf8');
  const {blockOnDay,blockMatchesResource}=await import(`data:text/javascript,${encodeURIComponent(source)}`);
  const block={ast_id:4,vehicle_id:9,start_time:'2026-09-30T00:00:00',end_time:'2026-10-01T00:00:00'};
  assert.equal(blockOnDay(block,'2026-09-30'),true);assert.equal(blockOnDay(block,'2026-10-01'),false);assert.equal(blockMatchesResource(block,'Van'),true);assert.equal(blockMatchesResource(block,'Gymnasium'),false);
});
