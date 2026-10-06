const test = require('node:test');
const assert = require('node:assert/strict');
const {attachStepActors} = require('./officeActionAudit');

test('processing actions are assigned to the correct repeated office visit', () => {
  const steps = [
    {pd_id: 1, current_office_id: 7, s_id: 4, time_in: '2026-09-20 08:00', time_out: '2026-09-20 09:00'},
    {pd_id: 2, current_office_id: 7, s_id: 3, time_in: '2026-09-21 08:00', time_out: '2026-09-21 09:00'}
  ];
  const actions = [
    {office_id: 7, action_type: 'Scanned In', full_name: 'First Receiver', action_timestamp: 'in-1'},
    {office_id: 7, action_type: 'Sent Back for Revision: Correct the title', full_name: 'Reviewer One', action_timestamp: 'return-1'},
    {office_id: 7, action_type: 'Scanned Out (Halted - Revision Required)', full_name: 'First Releaser', action_timestamp: 'out-1'},
    {office_id: 2, action_type: 'Resubmitted after correction', full_name: 'Submitter', action_timestamp: 'resubmit'},
    {office_id: 7, action_type: 'Scanned In', full_name: 'Second Receiver', action_timestamp: 'in-2'},
    {office_id: 7, action_type: 'Approved & Signed', full_name: 'Final Signer', action_timestamp: 'sign-2'},
    {office_id: 7, action_type: 'Scanned Out', full_name: 'Second Releaser', action_timestamp: 'out-2'}
  ];

  const result = attachStepActors(steps, actions);

  assert.equal(result[0].time_in_actor.name, 'First Receiver');
  assert.equal(result[0].correction.name, 'Reviewer One');
  assert.equal(result[0].correction.message, 'Correct the title');
  assert.equal(result[0].time_out_actor.name, 'First Releaser');
  assert.equal(result[0].signed_actor, undefined);
  assert.equal(result[1].time_in_actor.name, 'Second Receiver');
  assert.equal(result[1].signed_actor.name, 'Final Signer');
  assert.equal(result[1].time_out_actor.name, 'Second Releaser');
});

test('an unfinished received step retains its Time In actor', () => {
  const result = attachStepActors(
    [{pd_id: 1, current_office_id: 3, time_in: '2026-09-20 08:00', time_out: null}],
    [{office_id: 3, action_type: 'Scanned In', full_name: 'Office Processor', action_timestamp: 'in'}]
  );

  assert.equal(result[0].time_in_actor.name, 'Office Processor');
  assert.equal(result[0].time_out_actor, undefined);
});
