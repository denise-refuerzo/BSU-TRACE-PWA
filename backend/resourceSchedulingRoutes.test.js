const test = require('node:test');
const assert = require('node:assert/strict');
const registerScheduling = require('./resourceSchedulingRoutes');

function setup(booking, emailResult={success:true}) {
  const routes = new Map(), queries = [], emails = [];
  let released = false;
  const replies = [
    [booking],
    [],
    [{vehicle_id:2,vehicle_name:'Van 2'}],
    [{driver_id:3,full_name:'Driver B'}],
    [{asd_id:4,vehicle_name:'Van 2',plate_number:'ABC-123'}],
    [{full_name:'Driver B',license_number:'LICENSE-3'}]
  ];
  const client = {
    async query(sql,values) {
      queries.push({sql,values});
      if (['BEGIN','COMMIT','ROLLBACK'].includes(sql) || sql.includes('pg_advisory_xact_lock')) return {rows:[]};
      const isSelect = sql.trimStart().startsWith('SELECT');
      if (isSelect && !replies.length) throw new Error('Unexpected query');
      return {rows:isSelect ? replies.shift() : []};
    },
    release() {released=true;}
  };
  const app = {};
  for (const method of ['get','post','put']) app[method] = (path,...handlers) => routes.set(`${method} ${path}`,handlers);
  registerScheduling(app,{...client,connect:async()=>client},(req,res,next)=>next(),async(...args)=>{
    assert.equal(released,true,'Email must be sent after the transaction connection is released');
    emails.push(args);
    return emailResult;
  });
  return {queries,emails,async assign(body={vehicleId:2,driverId:3,start:'09:00',end:'11:00'}) {
    const handlers=routes.get('put /api/resources/assignments/:id');
    const req={params:{id:'public-booking'},body,user:{a_id:4,u_id:8}};
    const res={code:200,status(code){this.code=code;return this;},json(data){this.data=data;}};
    let step=0;const next=()=>handlers[step++]?.(req,res,next);
    await next();return res;
  }};
}

const booking = {
  booking_id:7,status:'Approved',purpose:'Conference trip',date:'2026-11-10',
  start:'09:00:00',end:'11:00:00',requestor_email:'requester@example.edu',
  assigned_vehicle_id:null,assigned_driver_id:null,vehicle_to_be_used:null,designated_driver:null
};

test('first vehicle and driver assignment sends one email with the selected pair',async()=>{
  const api=setup(booking);
  const res=await api.assign();
  assert.equal(res.code,200,JSON.stringify(res.data));
  assert.equal(res.data.emailSent,true);
  assert.equal(api.emails.length,1);
  assert.equal(api.emails[0][0],'requester@example.edu');
  assert.equal(api.emails[0][1].event,'vehicle and driver assigned');
  assert.equal(api.emails[0][1].vehicleName,'Van 2');
  assert.equal(api.emails[0][1].driverName,'Driver B');
  assert.equal(api.emails[0][1].status,'Approved');
  assert.ok(api.queries.some(query=>query.sql.includes('INSERT INTO public.booking_status_updates')));
});

test('reassignment emails the new and previous pair after commit',async()=>{
  const api=setup({...booking,assigned_vehicle_id:1,assigned_driver_id:1,vehicle_to_be_used:'Van 1',designated_driver:'Driver A'});
  const res=await api.assign();
  assert.equal(res.data.emailSent,true);
  assert.equal(api.emails.length,1);
  assert.equal(api.emails[0][1].event,'vehicle or driver reassigned');
  assert.equal(api.emails[0][1].previousVehicle,'Van 1');
  assert.equal(api.emails[0][1].previousDriver,'Driver A');
  assert.ok(api.queries.some(query=>query.sql.includes("status='Resource Reassigned'")));
});

test('saving the same pair and time does not send another email',async()=>{
  const api=setup({...booking,assigned_vehicle_id:2,assigned_driver_id:3,vehicle_to_be_used:'Van 2',designated_driver:'Driver B'});
  const res=await api.assign();
  assert.equal(res.data.emailSent,null);
  assert.equal(api.emails.length,0);
  assert.equal(res.data.message,'Assignment unchanged.');
});

test('changing the assignment time emails the revised schedule',async()=>{
  const api=setup({...booking,assigned_vehicle_id:2,assigned_driver_id:3,vehicle_to_be_used:'Van 2',designated_driver:'Driver B'});
  const res=await api.assign({vehicleId:2,driverId:3,start:'10:00',end:'12:00'});
  assert.equal(res.data.emailSent,true);
  assert.equal(api.emails[0][1].event,'assignment time updated');
  assert.equal(api.emails[0][1].start,'10:00:00');
  assert.ok(api.queries.some(query=>query.sql.includes('INSERT INTO public.booking_status_updates')));
});

test('email failure is reported without undoing the assignment',async()=>{
  const api=setup(booking,{success:false});
  const res=await api.assign();
  assert.equal(res.data.emailSent,false);
  assert.match(res.data.message,/could not be sent/);
  assert.ok(api.queries.some(query=>query.sql==='COMMIT'));
});
