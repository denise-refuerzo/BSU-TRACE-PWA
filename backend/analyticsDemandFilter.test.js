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

  const historicalCounts = [2, 3, 6, 9, 12].map(months => (
    filterDemandByMonths(rows, months).filter(row => row.type === 'historical').length
  ));
  assert.deepEqual(historicalCounts, [3, 4, 7, 10, 13]);

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

test('forecast-only legend selection focuses the chart on projected dates', async () => {
  const { getForecastFocusStart } = await import(pathToFileURL(path.join(
    __dirname,
    '..',
    'frontend',
    'src',
    'views',
    'portals',
    'gso-admin',
    'analyticsCharts.js'
  )).href);
  const datasets = [
    { data: [2, 1, 0, null, null] },
    { data: [1, 0, 3, null, null] },
    { data: [null, null, 0, 0.5, 0.7] },
    { data: [null, null, 3, 1.2, 1.4] }
  ];

  assert.equal(getForecastFocusStart(datasets, index => index >= 2), 2);
  assert.equal(getForecastFocusStart(datasets, () => true), null);
  assert.equal(getForecastFocusStart(datasets, () => false), null);
});

test('monthly forecast summary reports expected totals and daily patterns', async () => {
  const { summarizeDemandForecast } = await import(analyticsModuleUrl);
  const summary = summarizeDemandForecast([
    { date: '2026-09-28', type: 'forecast', vehicle_demand: 1, facility_demand: 2, vehicle_seasonality_score: 0.1, facility_seasonality_score: 0.2 },
    { date: '2026-09-29', type: 'forecast', vehicle_demand: 2, facility_demand: 3 },
    { date: '2026-10-03', type: 'forecast', vehicle_demand: 0, facility_demand: 1 },
    { date: '2026-09-27', type: 'historical', vehicle_demand: 10, facility_demand: 10 }
  ]);

  assert.equal(summary.days, 3);
  assert.equal(summary.vehicleTotal, 3);
  assert.equal(summary.facilityTotal, 6);
  assert.equal(summary.vehicleDailyAverage, 1);
  assert.equal(summary.facilityDailyAverage, 2);
  assert.equal(summary.busiestWeekday, 'Tuesday');
  assert.equal(summary.busiestWeekdayAverage, 5);
  assert.equal(summary.weekendDailyAverage, 1);
  assert.equal(summary.dominantDemand, 'facilities');
  assert.equal(summary.forecastBasis, 'Conservative weekday baseline');
});
