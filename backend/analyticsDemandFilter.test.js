const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const analyticsModuleUrl = pathToFileURL(path.join(
  __dirname,
  '..',
  'frontend',
  'src',
  'views',
  'portals',
  'gso-admin',
  'demandAnalytics.js'
)).href;

test('demand month filter uses the latest historical date and preserves forecasts', async () => {
  const { filterDemandByMonths, prepareDemandChart } = await import(analyticsModuleUrl);
  const rows = [];

  for (let monthOffset = 0; monthOffset < 13; monthOffset += 1) {
    const date = new Date(Date.UTC(2025, 8 + monthOffset, 15));
    rows.push({
      date: date.toISOString().slice(0, 10),
      type: 'historical',
      vehicle_demand: monthOffset,
      facility_demand: monthOffset + 1
    });
  }
  rows.push({
    date: '2026-10-15',
    type: 'forecast',
    vehicle_demand: 2,
    facility_demand: 3
  });

  const historicalCounts = [3, 6, 9, 12].map(months => (
    filterDemandByMonths(rows, months).filter(row => row.type === 'historical').length
  ));
  assert.deepEqual(historicalCounts, [4, 7, 10, 13]);

  const prepared = prepareDemandChart(rows, 3).chartReadyDemandData;
  assert.equal(prepared.at(-1).type, 'forecast');
  assert.notEqual(prepared.at(-2).van_fore, null, 'last historical point should connect to forecast');
  assert.equal(prepared.at(-1).van_hist, null);
});

test('ranked analytics metrics sort numerically in both directions', async () => {
  const { sortMetricRows } = await import(analyticsModuleUrl);
  const rows = [
    { name: 'Gamma', count: '2' },
    { name: 'Alpha', count: 10 },
    { name: 'Beta', count: 2 }
  ];

  assert.deepEqual(sortMetricRows(rows, 'count', 'desc').map(row => row.name), ['Alpha', 'Beta', 'Gamma']);
  assert.deepEqual(sortMetricRows(rows, 'count', 'asc').map(row => row.name), ['Beta', 'Gamma', 'Alpha']);
  assert.deepEqual(rows.map(row => row.name), ['Gamma', 'Alpha', 'Beta'], 'sorting must not mutate API data');
});
