const test = require('node:test');
const assert = require('node:assert/strict');
const {suggestFleetAssignment, getOfficeSignals} = require('./decisionSupport');

test('GSO suggestion uses available vehicles and drivers with the fewest recent trips', async () => {
  const queries = [];
  const rows = [
    [],
    [{vehicle_id: 1, vehicle_name: 'Van A'}, {vehicle_id: 2, vehicle_name: 'Van B'}],
    [{driver_id: 3, full_name: 'Driver A'}, {driver_id: 4, full_name: 'Driver B'}],
    [{vehicle_id: 1, driver_id: 3, trips: 5}, {vehicle_id: 2, driver_id: 4, trips: 1}]
  ];
  const db = {async query(sql, params) { queries.push({sql, params}); return {rows: rows.shift()}; }};
  const result = await suggestFleetAssignment(db, {booking_id: 10, date: '2026-10-17', start: '09:00', end: '11:00'});
  assert.deepEqual([result.suggestion.vehicleId, result.suggestion.driverId], [2, 4]);
  assert.deepEqual([result.suggestion.vehicleTrips, result.suggestion.driverTrips], [1, 1]);
  assert.deepEqual(queries[3].params, ['2026-10-17', [1, 2], [3, 4]]);
});

test('no fleet suggestion is given when the requested window has no free pair', async () => {
  let calls = 0;
  const db = {async query() { calls++; return {rows: calls === 1 ? [{}] : []}; }};
  const result = await suggestFleetAssignment(db, {booking_id: 10, date: '2026-10-17', start: '09:00', end: '11:00'});
  assert.equal(result.suggestion, null);
  assert.equal(calls, 1);
});

test('historical usage failures leave available assignment choices intact', async () => {
  let calls = 0;
  const rows = [[], [{vehicle_id: 2}], [{driver_id: 4}]];
  const db = {async query() { return calls++ < 3 ? {rows: rows.shift()} : Promise.reject(new Error('history unavailable')); }};
  const result = await suggestFleetAssignment(db, {booking_id: 10, date: '2026-10-17', start: '09:00', end: '11:00'});
  assert.equal(result.available, true);
  assert.equal(result.suggestion, null);
  assert.equal(result.vehicles.length, 1);
});

test('office signals query is limited to supplied offices and recent completed stops', async () => {
  let captured;
  const db = {async query(sql, params) { captured = {sql, params}; return {rows: [{office_id: 2, completed_stops: 4, avg_hours: '2.0', open_stops: 1}]}; }};
  assert.equal((await getOfficeSignals(db, [2]))[0].office_id, 2);
  assert.deepEqual(captured.params, [[2]]);
  assert.match(captured.sql, /90 days/);
  assert.match(captured.sql, /time_out IS NULL/);
});
