const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {EventEmitter} = require('node:events');

test('document listener subscribes, emails only statuses 4 and 5, and reconnects once', async () => {
  const source = fs.readFileSync(require.resolve('./server'), 'utf8');
  const start = source.indexOf('const initDatabaseListener = async () => {');
  const end = source.indexOf('// 9.1 FETCH USER NOTIFICATIONS ENDPOINT', start);
  assert.ok(start > 0 && end > start);
  const client = new EventEmitter();
  const queries = [];
  const emails = [];
  const reconnects = [];
  const releases = [];
  client.query = async sql => {queries.push(sql);return {rows:[]};};
  client.release = value => releases.push(value);
  const pool = {
    connect: async () => client,
    query: async (_sql, values) => {
      assert.deepEqual(Array.from(values), [19, values[1]]);
      return {rows:[{title:'Report',uni_email:'user@example.edu',full_name:'Alex',current_status:values[1]===4?'Action Required':'Completed'}]};
    }
  };
  const listener = vm.runInNewContext(`${source.slice(start,end)}\ninitDatabaseListener`, {
    pool,sendTrackingAlertEmail:async (...args)=>{emails.push(args);return {success:true};},
    setTimeout:(fn,ms)=>reconnects.push({fn,ms}),console:{log(){},error(){}}
  });
  await listener();
  assert.deepEqual(queries,['LISTEN document_status_email_channel']);
  const notify = client.listeners('notification')[0];
  for (const status of [3,4,5]) await notify({channel:'document_status_email_channel',payload:JSON.stringify({ini_id:19,s_id:status})});
  await notify({channel:'unrelated',payload:JSON.stringify({ini_id:19,s_id:4})});
  assert.equal(emails.length,2);
  assert.equal(emails[0][3],'Action Required');
  assert.equal(emails[1][3],'Completed');
  client.emit('error',new Error('disconnected'));
  client.emit('end');
  assert.deepEqual(releases,[true]);
  assert.equal(reconnects.length,1);
  assert.equal(reconnects[0].ms,5000);
});
