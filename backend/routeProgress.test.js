const test = require('node:test');
const assert = require('node:assert/strict');
const {routeProgress} = require('./routeProgress');
const visit = (id, office, extra = {}) => ({pd_id:id,current_office_id:office,s_id:3,
  time_in:'2026-09-13 09:00:00',time_out:'2026-09-13 10:00:00',is_adhoc:false,...extra});

test('ad hoc completion skips its original stop while retaining both history entries', () => {
  const steps = [visit(1,1),visit(2,3,{is_adhoc:true}),visit(3,2)];
  const result = routeProgress([1,2,3,4],steps);
  assert.equal(result.nextIndex,3);
  assert.deepEqual(result.history.map(s=>s.current_office_id),[1,3,2,3]);
  assert.equal(result.history.at(-1).completed_via_adhoc,true);
  assert.equal(steps.length,3);
  assert.equal(routeProgress([1,2,3,4],[...steps,visit(4,4)]).nextIndex,4);
});

test('pending, signed but unreleased, and returned ad hoc visits do not satisfy a stop', () => {
  for (const extra of [{s_id:1,time_out:null},{s_id:3,time_out:null},{s_id:4}]) {
    assert.equal(routeProgress([1,2],[visit(1,1),visit(2,2,{is_adhoc:true,...extra})]).nextIndex,1);
  }
});

test('the requesting office must still finish its own work', () => {
  const result=routeProgress([1,2],[visit(1,1,{s_id:1,time_out:null}),visit(2,2,{is_adhoc:true})]);
  assert.equal(result.nextIndex,0);
  assert.equal(result.routeSteps.find(s=>s.route_position===1).completed_via_adhoc,true);
});

test('multiple future stops and the final stop can all be satisfied via detours', () => {
  assert.equal(routeProgress([1,2,3],[visit(1,1),visit(2,3,{is_adhoc:true}),visit(3,2,{is_adhoc:true})]).nextIndex,3);
});

test('off-route detours and past-office detours do not skip unrelated work', () => {
  assert.equal(routeProgress([1,2,3],[visit(1,1),visit(2,2),visit(3,1,{is_adhoc:true}),visit(4,8,{is_adhoc:true})]).nextIndex,2);
});

test('one ad hoc completion only satisfies one occurrence of a repeated office', () => {
  const steps=[visit(1,1),visit(2,2,{is_adhoc:true})];
  assert.equal(routeProgress([1,2,2,3],steps).nextIndex,2);
  assert.equal(routeProgress([1,2,2,3],[...steps,visit(3,2)]).nextIndex,3);
  assert.equal(routeProgress([1,2,3,2],[...steps,visit(3,3)]).nextIndex,3);
});

test('repeated detours before the same route stop do not complete later occurrences', () => {
  assert.equal(routeProgress([1,2,3,2],[visit(1,1),visit(2,2,{is_adhoc:true}),visit(3,2,{is_adhoc:true}),visit(4,3)]).nextIndex,3);
});

test('corrections do not advance the route until successful resubmission', () => {
  const steps=[visit(1,1),visit(2,3,{is_adhoc:true,s_id:4}),visit(3,3,{is_adhoc:true}),visit(4,2,{s_id:4})];
  assert.equal(routeProgress([1,2,3,4],steps).nextIndex,1);
  assert.equal(routeProgress([1,2,3,4],[...steps,visit(5,2)]).nextIndex,3);
});

test('an existing redundant visit does not skip the following unprocessed office', () => {
  assert.equal(routeProgress([1,2,3,4],[visit(1,1),visit(2,3,{is_adhoc:true}),visit(3,2),visit(4,3)]).nextIndex,3);
});
