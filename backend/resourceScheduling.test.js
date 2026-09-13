const test = require('node:test');
const assert = require('node:assert/strict');
const {availability,assertConfirmable,validateWindow,lockSchedule}=require('./resourceScheduling');
function db(results){let index=0;return {queries:[],async query(sql,values){this.queries.push({sql,values});assert.ok(index<results.length,'Unexpected database query');return {rows:results[index++]};}};}
const vehicleWindow={date:'2026-10-01',start:'09:00',end:'10:00',type:'Vehicle'};
test('requires a real date and complete positive travel interval',()=>{
 for(const values of [['2026-02-30','09:00','10:00'],['2026-10-01','10:00','10:00'],['2026-10-01','11:00','10:00'],['2026-10-01','','10:00']]) assert.throws(()=>validateWindow(...values));
 assert.doesNotThrow(()=>validateWindow('2026-10-01','09:00','10:00'));
});
test('another vehicle and driver allow an overlapping request; pending does not block',async()=>{
 const client=db([[],[{vehicle_id:2}],[{driver_id:3}]]);
 assert.equal((await availability(client,vehicleWindow)).available,true);
 for(const {sql,values} of client.queries){assert.ok(sql.includes("b.status = 'Confirmed'"));assert.ok(!sql.includes('Reserved'));assert.deepEqual(values,['2026-10-01','09:00','10:00',0]);}
 assert.match(client.queries[1].sql,/vr.assigned_vehicle_id = f.vehicle_id/);
 assert.match(client.queries[2].sql,/vr.assigned_driver_id = d.driver_id/);
 // Strict overlap permits touching endpoints, including morning/afternoon reuse.
 assert.match(client.queries[1].sql,/vr.pick_up_time < \$3::time AND vr.drop_off_time > \$2::time/);
});
test('no vehicle OR no driver rejects availability',async()=>{
 for(const rows of [[[],[],[{driver_id:1}]],[[],[{vehicle_id:1}],[]]]) assert.equal((await availability(db(rows),vehicleWindow)).available,false);
});
test('legacy confirmed requests block availability until assigned',async()=>{
 const client=db([[{}]]);assert.equal((await availability(client,vehicleWindow)).available,false);assert.equal(client.queries.length,1);
});
test('facility confirmation and maintenance block only the requested interval',async()=>{
 const client=db([[{asd_id:10}],[{}]]);
 assert.equal((await availability(client,{...vehicleWindow,type:'Room',assetName:'Multimedia Room'})).available,false);
 assert.deepEqual(client.queries[1].values,[10,'2026-10-01','09:00','10:00',0]);
 assert.match(client.queries[1].sql,/asset_blackouts/);
 assert.equal((await availability(db([[{asd_id:10}],[]]),{...vehicleWindow,type:'Room',assetName:'Multimedia Room'})).available,true);
});
test('confirmation requires selected vehicle and driver to still be free',async()=>{
 const booking={...vehicleWindow,booking_type:'Vehicle',assigned_vehicle_id:1,assigned_driver_id:1};
 await assert.rejects(assertConfirmable(db([[booking],[],[{vehicle_id:2}],[{driver_id:1}]]),5),/assign an available/);
 await assert.doesNotReject(assertConfirmable(db([[booking],[],[{vehicle_id:1}],[{driver_id:1}]]),5));
});
test('schedule writers share a transaction advisory lock',async()=>{
 const client=db([[]]);await lockSchedule(client);assert.match(client.queries[0].sql,/pg_advisory_xact_lock/);
});
test('checklist confirmation conflict rolls back checklist and status changes',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync(require.resolve('./server'),'utf8');const start=source.indexOf("app.put('/api/procurement/checklists/:checkId'");const end=source.indexOf('// 13.4 PROCUREMENT:',start);
 let handler;const queries=[];
 const client={async query(sql){queries.push(sql);if(sql.includes('RETURNING check_id'))return {rows:[{check_id:1}]};if(sql.includes('SELECT is_checked'))return {rows:[{is_checked:true}]};return {rows:[]};},release(){}};
 vm.runInNewContext(source.slice(start,end),{app:{put:(path,auth,fn)=>handler=fn},requireAuth(){},pool:{connect:async()=>client},lockSchedule:async()=>{},assertConfirmable:async()=>{throw Object.assign(new Error('Schedule conflict'),{status:409});}});
 const res={status(code){this.code=code;return this;},json(value){this.value=value;}};
 await handler({user:{a_id:4},params:{checkId:1},body:{bookingId:1,isChecked:true}},res);
 assert.equal(res.code,409);assert.equal(queries.at(-1),'ROLLBACK');assert.ok(!queries.some(sql=>sql.includes("status = 'Confirmed'")));
});
