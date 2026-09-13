// Run against localServer.js only. Never point this at production.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='http://127.0.0.1:5055';
const tokens=new Map(),results=[];
async function request(user,path,body,method=body?'POST':'GET') {
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(tokens.has(user)?{Authorization:`Bearer ${tokens.get(user)}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json()};
}
async function ok(user,path,body,method) {const r=await request(user,path,body,method);assert.ok(r.status>=200&&r.status<300,`${path}: ${r.status} ${JSON.stringify(r.data)}`);return r.data;}
async function check(name,fn) {try {await fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false,error:e.message});console.log('FAIL',name,e.message);}}
async function submit(title,pipeline=1,user=1,extra={}) {return ok(user,'/api/documents',{title,processTypeId:pipeline,...extra});}
async function detail(id,user=1) {return ok(user,`/api/office/documents/${id}`);}
async function action(user,id,type,extra={}) {const path=type==='adhoc'?'/api/processor/documents/ad-hoc':type.startsWith('scan-')?`/api/documents/${type}`:`/api/office/${type}`;return ok(user,path,{iniId:id,...extra});}
async function finish(user,id) {await action(user,id,'sign');return action(user,id,'scan-out');}
async function main() {
  for(const id of [1,2,3,4,5,6,7,8,9]) {const login=await ok(null,'/api/login',{username:`verify${id}`,password:'LocalVerify123!'});tokens.set(id,login.token);}
  await check('Unauthenticated document reads are rejected',async()=>assert.equal((await request(null,'/api/documents/1')).status,401));
  const normal=await submit('VERIFY normal A-B-C-D');
  await check('Submission creates QR, route snapshot and first awaiting office',async()=>{
    const d=await detail(normal.iniId);assert.match(d.qr_code,/^TRK-/);assert.deepEqual(d.route_snapshot,[1,2,3,4]);assert.equal(d.steps.length,1);assert.equal(d.steps[0].time_in,null);
  });
  await check('Wrong office cannot receive, sign, return, release or detour',async()=>{
    for(const path of ['/api/documents/scan-in','/api/documents/scan-out','/api/office/sign','/api/office/return','/api/processor/documents/ad-hoc']) assert.equal((await request(7,path,{iniId:normal.iniId,reason:'test',targetOfficeId:2})).status,409);
  });
  await check('Signing and releasing before receipt are rejected',async()=>{
    for(const path of ['/api/office/sign','/api/documents/scan-out']) assert.equal((await request(2,path,{iniId:normal.iniId})).status,409);
  });
  await check('QR receipt and duplicate-scan prevention',async()=>{
    await ok(2,'/api/documents/scan-in',{qrCode:normal.qrCode});
    assert.equal((await request(2,'/api/documents/scan-in',{qrCode:normal.qrCode})).status,409);
    assert.equal((await request(2,'/api/documents/scan-out',{iniId:normal.iniId})).status,409);
  });
  await check('Normal passage through processor, signee, GSO and last office',async()=>{
    for(const [user,office] of [[2,1],[3,2],[4,3],[5,4]]) {
      if(office!==1) await action(user,normal.iniId,'scan-in');
      await finish(user,normal.iniId);
      const d=await detail(normal.iniId);const active=d.steps.filter(s=>!s.time_out);
      assert.equal(active.length,office===4?0:1);
      if(office<4) assert.equal(active[0].current_office_id,office+1);
    }
    const docs=await ok(1,'/api/documents/1');assert.equal(docs.find(d=>d.ini_id===normal.iniId).status,'Completed');
  });
  await check('Completed documents reject further processing and have audit records',async()=>{
    assert.equal((await request(5,'/api/documents/scan-in',{iniId:normal.iniId})).status,409);
    const d=await detail(normal.iniId);assert.equal(d.actions.length,13);assert.ok(d.steps.every(s=>s.time_in&&s.time_out));
  });
  await check('Office-submitted document can complete its originating stop at submission',async()=>{
    const d=await submit('VERIFY completed origin',1,2,{completeOriginProcessing:true});
    const details=await detail(d.iniId,2);assert.equal(details.steps[0].s_id,3);assert.equal(details.steps[1].current_office_id,2);
    assert.equal((await request(1,'/api/documents',{title:'Invalid fast submit',processTypeId:1,completeOriginProcessing:true})).status,403);
  });
  await check('College placeholder resolves to the submitter department office',async()=>{
    const d=await submit('VERIFY college',4);assert.deepEqual((await detail(d.iniId)).route_snapshot,[11,2]);await action(9,d.iniId,'scan-in');
  });
  const adhoc=await submit('VERIFY ad hoc A-C-A-B-D');
  await check('Ad hoc hold, return and completion credit',async()=>{
    await action(2,adhoc.iniId,'scan-in');await action(2,adhoc.iniId,'adhoc',{targetOfficeId:3});
    assert.equal((await request(2,'/api/office/sign',{iniId:adhoc.iniId})).status,409);
    await action(4,adhoc.iniId,'scan-in');await finish(4,adhoc.iniId);
    const d=await detail(adhoc.iniId);assert.equal(d.steps.find(s=>!s.time_out).current_office_id,1);
    assert.equal(d.route_steps.find(s=>s.route_position===2).completed_via_adhoc,true);
    await finish(2,adhoc.iniId);await action(3,adhoc.iniId,'scan-in');await finish(3,adhoc.iniId);
    assert.equal((await detail(adhoc.iniId)).steps.at(-1).current_office_id,4);
    assert.equal((await ok(4,'/api/processor/documents/expected-list/3')).some(d=>d.ini_id===adhoc.iniId),false);
  });
  await check('Originator history retains skipped original route stop',async()=>{
    const d=(await ok(1,'/api/documents/1')).find(d=>d.ini_id===adhoc.iniId);
    assert.equal(d.current_office,'Office D');assert.ok(d.history_logs.some(s=>s.completed_via_adhoc&&s.current_office_id===3));
  });
  await check('Normal correction requires release before resubmission and resumes same office',async()=>{
    const d=await submit('VERIFY correction');await action(2,d.iniId,'scan-in');await action(2,d.iniId,'return',{reason:'Update attachment'});
    assert.equal((await request(1,`/api/documents/${d.iniId}/resubmit`,{title:'Fixed'})).status,409);
    await action(2,d.iniId,'scan-out');
    assert.equal((await request(8,`/api/documents/${d.iniId}/resubmit`,{title:'Forged'})).status,403);
    await ok(1,`/api/documents/${d.iniId}/resubmit`,{title:'VERIFY corrected'});await action(2,d.iniId,'scan-in');await finish(2,d.iniId);
    assert.equal((await detail(d.iniId)).steps.at(-1).current_office_id,2);
  });
  await check('Nested ad hoc detours return in reverse order without duplicate route visits',async()=>{
    const d=await submit('VERIFY nested');await action(2,d.iniId,'scan-in');await action(2,d.iniId,'adhoc',{targetOfficeId:3});
    await action(4,d.iniId,'scan-in');await action(4,d.iniId,'adhoc',{targetOfficeId:2});await action(3,d.iniId,'scan-in');await finish(3,d.iniId);await finish(4,d.iniId);await finish(2,d.iniId);
    assert.equal((await detail(d.iniId)).steps.at(-1).current_office_id,4);
  });
  await check('Cross-account document and office reads are forbidden',async()=>{
    for(const path of [`/api/office/documents/${normal.iniId}`,'/api/documents/1','/api/processor/documents/pipeline/1']) assert.equal((await request(8,path)).status,403);
  });
  await check('Notifications, office ledger, incoming list, KPIs and audit endpoints return data',async()=>{
    for(const path of ['/api/notifications/2/2/1','/api/processor/documents/pipeline/1','/api/processor/documents/expected-list/1','/api/processor/documents/kpi-metrics/1','/api/processor/history/1','/api/chat/active-documents-directory',`/api/chat/document-channels/${normal.iniId}`]) await ok(2,path);
  });
  await check('Resource and administration read endpoints work with the supplied schema',async()=>{
    for(const path of ['/api/resources/inventory','/api/resources/assets','/api/resources/blackouts','/api/resources/bookings','/api/procurement/reservations','/api/procurement/logistics','/api/admin/infrastructure-summary','/api/admin/dashboard-metrics','/api/accounts','/api/offices','/api/document-categories','/api/process-types']) await ok(6,path);
  });
  // Account security is part of verifying that unrelated users cannot process
  // a document by obtaining another office's session.
  await check('2FA verification cannot create a session without an issued code',async()=>{
    const result=await request(null,'/api/login/verify-2fa',{userId:8,otpCode:null});assert.ok([400,401,403].includes(result.status),`Expected rejection, got HTTP ${result.status}`);
  });
  fs.writeFileSync(require('node:path').join(__dirname,'results.json'),JSON.stringify(results,null,2));
  console.log(`${results.filter(r=>r.passed).length}/${results.length} checks passed`);
  if(results.some(r=>!r.passed)) process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
