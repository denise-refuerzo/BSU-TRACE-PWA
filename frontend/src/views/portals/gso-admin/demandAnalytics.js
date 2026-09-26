export function filterDemandByMonths(rows = [], months = 3) {
  const validRows = rows.filter(row => row?.date);
  const historicalRows = validRows
    .filter(row => row.type === 'historical')
    .sort((a, b) => a.date.localeCompare(b.date));
  const forecastRows = validRows
    .filter(row => row.type === 'forecast')
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!historicalRows.length) return forecastRows;

  const latestHistoricalDate = new Date(`${historicalRows.at(-1).date}T00:00:00Z`);
  const selectedMonths = Number.isFinite(Number(months)) ? Number(months) : 3;
  const desiredDay = latestHistoricalDate.getUTCDate();
  const cutoffDate = new Date(Date.UTC(
    latestHistoricalDate.getUTCFullYear(),
    latestHistoricalDate.getUTCMonth() - selectedMonths,
    1
  ));
  const lastDayOfCutoffMonth = new Date(Date.UTC(
    cutoffDate.getUTCFullYear(),
    cutoffDate.getUTCMonth() + 1,
    0
  )).getUTCDate();
  cutoffDate.setUTCDate(Math.min(desiredDay, lastDayOfCutoffMonth));
  const cutoff = cutoffDate.toISOString().slice(0, 10);

  return [...historicalRows.filter(row => row.date >= cutoff), ...forecastRows];
}

export function sortMetricRows(rows = [], valueKey, direction = 'desc') {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((left, right) => {
    const difference = (Number(left[valueKey]) || 0) - (Number(right[valueKey]) || 0);
    if (difference !== 0) return difference * multiplier;
    return String(left.name || left.asset_name || left.route_name || '').localeCompare(
      String(right.name || right.asset_name || right.route_name || '')
    );
  });
}

export function summarizeDemandForecast(rows = []) {
  const forecastRows = rows.filter(row => row?.type === 'forecast' && row?.date);
  if (!forecastRows.length) return null;

  const vehicleTotal = forecastRows.reduce((total, row) => total + (Number(row.vehicle_demand) || 0), 0);
  const facilityTotal = forecastRows.reduce((total, row) => total + (Number(row.facility_demand) || 0), 0);
  const weekdayGroups = new Map();
  let weekdayTotal = 0;
  let weekdayCount = 0;
  let weekendTotal = 0;
  let weekendCount = 0;

  forecastRows.forEach(row => {
    const day = new Date(`${row.date}T00:00:00Z`).getUTCDay();
    const combined = (Number(row.vehicle_demand) || 0) + (Number(row.facility_demand) || 0);
    const group = weekdayGroups.get(day) || { total: 0, count: 0 };
    weekdayGroups.set(day, { total: group.total + combined, count: group.count + 1 });
    if (day === 0 || day === 6) {
      weekendTotal += combined;
      weekendCount += 1;
    } else {
      weekdayTotal += combined;
      weekdayCount += 1;
    }
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const busiestDay = [...weekdayGroups.entries()]
    .filter(([day]) => day > 0 && day < 6)
    .map(([day, value]) => ({ day, average: value.total / value.count }))
    .sort((left, right) => right.average - left.average)[0];
  const metadata = forecastRows[0];
  const vehicleSeasonal = Number(metadata.vehicle_seasonality_score || 0) >= 0.30;
  const facilitySeasonal = Number(metadata.facility_seasonality_score || 0) >= 0.30;

  return {
    days: forecastRows.length,
    vehicleTotal,
    facilityTotal,
    vehicleDailyAverage: vehicleTotal / forecastRows.length,
    facilityDailyAverage: facilityTotal / forecastRows.length,
    weekdayDailyAverage: weekdayCount ? weekdayTotal / weekdayCount : 0,
    weekendDailyAverage: weekendCount ? weekendTotal / weekendCount : 0,
    busiestWeekday: busiestDay ? dayNames[busiestDay.day] : 'Unavailable',
    busiestWeekdayAverage: busiestDay?.average || 0,
    dominantDemand: facilityTotal >= vehicleTotal ? 'facilities' : 'vans',
    forecastBasis: vehicleSeasonal && facilitySeasonal
      ? 'Validated weekly pattern'
      : vehicleSeasonal || facilitySeasonal
        ? 'Mixed seasonal and baseline estimate'
        : 'Conservative weekday baseline'
  };
}

export function prepareDemandChart(rows = [], months = 3) {
  const filteredRows = filterDemandByMonths(rows, months);
  const lastHistoricalIndex = filteredRows.findLastIndex(row => row.type === 'historical');
  const transitionDate = lastHistoricalIndex >= 0 ? filteredRows[lastHistoricalIndex].date : null;

  return {
    transitionDate,
    chartReadyDemandData: filteredRows.map((row, index) => {
      const isForecast = row.type === 'forecast';
      const isLastHistorical = index === lastHistoricalIndex;
      return {
        ...row,
        van_hist: !isForecast ? row.vehicle_demand : null,
        fac_hist: !isForecast ? row.facility_demand : null,
        van_fore: isForecast ? row.vehicle_demand : (isLastHistorical ? row.vehicle_demand : null),
        fac_fore: isForecast ? row.facility_demand : (isLastHistorical ? row.facility_demand : null)
      };
    })
  };
}
