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
