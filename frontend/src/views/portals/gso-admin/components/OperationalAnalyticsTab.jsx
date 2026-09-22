import { useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart2, Check, Database, Download, Lightbulb, Maximize2,
  Move, Package, RotateCcw, Search, Settings, ShieldCheck, Truck, Zap
} from 'lucide-react';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import { baseChartOptions, buildForecastChartData, forecastChartOptions } from '../analyticsCharts';
import { sortMetricRows } from '../demandAnalytics';

const COLORS = ['#991b1b', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4b5563'];
const LAYOUT_KEY = 'gso-operational-analytics-layout-v2';
const DEFAULT_LAYOUT = [
  { id: 'bottleneck', size: 2 },
  { id: 'inventory', size: 1 },
  { id: 'traffic', size: 2 },
  { id: 'frequency', size: 1 },
  { id: 'forecast', size: 3 },
  { id: 'routing', size: 2 },
  { id: 'vehicles', size: 1 }
];

function readLayout() {
  try {
    const stored = JSON.parse(localStorage.getItem(LAYOUT_KEY));
    if (!Array.isArray(stored)) return DEFAULT_LAYOUT;
    const validIds = new Set(DEFAULT_LAYOUT.map(item => item.id));
    const valid = stored.filter(item => validIds.has(item.id) && [1, 2, 3].includes(item.size));
    const missing = DEFAULT_LAYOUT.filter(item => !valid.some(saved => saved.id === item.id));
    return [...valid, ...missing];
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function ChartSwitch({ value, onChange, options }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1" aria-label="Chart type">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors ${
            value === option.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          }`}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return <div className="flex h-full items-center justify-center text-center text-xs font-semibold text-gray-400">{message}</div>;
}

function SortSelect({ value, onChange, highestLabel = 'Highest first', lowestLabel = 'Lowest first' }) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      aria-label="Sort metric"
      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 sm:w-auto"
    >
      <option value="desc">{highestLabel}</option>
      <option value="asc">{lowestLabel}</option>
    </select>
  );
}

function DashboardCard({ card, editMode, onResize, onDragStart, onDrop, children, title, subtitle, icon, accent = 'border-t-gray-400' }) {
  const span = card.size === 3 ? 'xl:col-span-3' : card.size === 2 ? 'xl:col-span-2' : 'xl:col-span-1';
  return (
    <section
      draggable={editMode}
      onDragStart={() => onDragStart(card.id)}
      onDragOver={event => editMode && event.preventDefault()}
      onDrop={() => onDrop(card.id)}
      className={`${span} min-h-[360px] rounded-2xl border-x border-b border-t-4 ${accent} bg-white p-4 shadow-sm transition-all sm:min-h-[390px] sm:p-6 ${
        editMode ? 'cursor-move border-dashed ring-1 ring-gray-200 hover:shadow-md' : 'border-gray-200'
      }`}
    >
      <div className="mb-5 flex min-h-14 flex-col items-start justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">{icon}{title}</h3>
          <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">{subtitle}</p>
        </div>
        {editMode && (
          <div className="flex shrink-0 items-center gap-1">
            <Move size={16} className="text-gray-400" aria-hidden="true" />
            <button
              type="button"
              onClick={event => { event.stopPropagation(); onResize(card.id); }}
              className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              title="Resize card"
            >
              <Maximize2 size={15} />
            </button>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

function RankedChart({ rows, labelKey, valueKey, chartType, datasetLabel, unit = '' }) {
  const data = {
    labels: rows.map(row => row[labelKey]),
    datasets: [{
      label: datasetLabel,
      data: rows.map(row => Number(row[valueKey] || 0)),
      backgroundColor: chartType === 'bar' ? '#991b1b' : rows.map((_, index) => COLORS[index % COLORS.length]),
      borderColor: chartType === 'bar' ? '#7f1d1d' : '#ffffff',
      borderWidth: chartType === 'bar' ? 0 : 2,
      borderRadius: chartType === 'bar' ? 6 : 0
    }]
  };
  const options = chartType === 'bar' ? {
    ...baseChartOptions,
    indexAxis: 'y',
    plugins: { ...baseChartOptions.plugins, legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { callback: value => `${value}${unit}`, font: { size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 } } }
    }
  } : baseChartOptions;
  if (chartType === 'pie') return <Pie data={data} options={options} />;
  if (chartType === 'doughnut') return <Doughnut data={data} options={{ ...options, cutout: '58%' }} />;
  return <Bar data={data} options={options} />;
}

export default function OperationalAnalyticsTab({
  auditStartDate, setAuditStartDate, auditEndDate, setAuditEndDate,
  handleGenerateAuditReport, isAnalyticsLoading, bottleneckSearch,
  setBottleneckSearch, bottleneckSort, setBottleneckSort,
  processedBottleneckData, equipmentInventory, demandTimeFilter,
  setDemandTimeFilter, chartReadyDemandData, systemHealth, routePerf,
  administrativeInsights
}) {
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState(readLayout);
  const [draggedId, setDraggedId] = useState(null);
  const [bottleneckMode, setBottleneckMode] = useState('office');
  const [bottleneckChart, setBottleneckChart] = useState('bar');
  const [inventoryChart, setInventoryChart] = useState('doughnut');
  const [trafficChart, setTrafficChart] = useState('line');
  const [trafficRange, setTrafficRange] = useState(12);
  const [frequencyMode, setFrequencyMode] = useState('documents');
  const [frequencyChart, setFrequencyChart] = useState('bar');
  const [forecastChart, setForecastChart] = useState('line');
  const [routingView, setRoutingView] = useState('bar');
  const [inventorySort, setInventorySort] = useState('desc');
  const [frequencySort, setFrequencySort] = useState('desc');
  const [routingSort, setRoutingSort] = useState('desc');
  const [vehicleSort, setVehicleSort] = useState('desc');

  useEffect(() => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  }, [layout]);

  const processBottlenecks = useMemo(() => (routePerf?.document_routes || [])
    .map(route => ({ office_name: route.route_name, dwell_time_hours: Number(route.avg_completion_hours || 0) }))
    .filter(item => item.office_name.toLowerCase().includes((bottleneckSearch || '').toLowerCase()))
    .sort((a, b) => bottleneckSort === 'desc' ? b.dwell_time_hours - a.dwell_time_hours : a.dwell_time_hours - b.dwell_time_hours)
    .slice(0, 5), [routePerf, bottleneckSearch, bottleneckSort]);

  const bottleneckRows = bottleneckMode === 'office' ? processedBottleneckData : processBottlenecks;
  const trafficRows = (administrativeInsights?.peak_traffic || []).slice(-trafficRange);
  const rawFrequencyRows = frequencyMode === 'documents'
    ? (administrativeInsights?.frequent_documents || [])
    : (administrativeInsights?.utilized_assets || []);
  const frequencyValueKey = frequencyMode === 'documents' ? 'request_count' : 'usage_count';
  const frequencyRows = sortMetricRows(rawFrequencyRows, frequencyValueKey, frequencySort).slice(0, 8);
  const inventoryRows = sortMetricRows(equipmentInventory || [], 'current_stock', inventorySort).slice(0, 8);
  const routes = sortMetricRows(routePerf?.document_routes || [], 'avg_completion_hours', routingSort);
  const vehicles = sortMetricRows(routePerf?.vehicle_scheduling || [], 'avg_turnaround_hours', vehicleSort);
  const isDbHealthy = systemHealth?.database_connection === 'HEALTHY';

  const moveCard = targetId => {
    if (!editMode || !draggedId || draggedId === targetId) return;
    setLayout(current => {
      const next = [...current];
      const from = next.findIndex(item => item.id === draggedId);
      const to = next.findIndex(item => item.id === targetId);
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggedId(null);
  };

  const cycleCardSize = id => setLayout(current => current.map(item => (
    item.id === id ? { ...item, size: item.size === 3 ? 1 : item.size + 1 } : item
  )));

  const resetLayout = () => setLayout(DEFAULT_LAYOUT.map(item => ({ ...item })));

  const trafficData = {
    labels: trafficRows.map(item => item.month),
    datasets: [{
      label: 'Document requests',
      data: trafficRows.map(item => Number(item.request_count || 0)),
      borderColor: '#2563eb', backgroundColor: trafficChart === 'line' ? 'rgba(37, 99, 235, .12)' : '#2563eb',
      fill: trafficChart === 'line', tension: 0.32, borderRadius: 5
    }]
  };

  const trafficOptions = {
    ...baseChartOptions,
    plugins: { ...baseChartOptions.plugins, legend: { display: false } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { precision: 0 } } }
  };

  const forecastData = buildForecastChartData(chartReadyDemandData || [], forecastChart === 'line');
  const projectionInfo = (chartReadyDemandData || []).find(row => row.model_note);

  const contents = {
    bottleneck: card => (
      <DashboardCard key={card.id} card={card} editMode={editMode} onResize={cycleCardSize} onDragStart={setDraggedId} onDrop={moveCard}
        title="Processing Delay Analysis"
        subtitle={bottleneckMode === 'office' ? 'Average processing time for completed documents at each office.' : 'End-to-end completion time by document process.'}
        icon={<BarChart2 className="text-red-700" size={18} />} accent="border-t-red-700">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            {[['office', 'By office'], ['process', 'By process']].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setBottleneckMode(value)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${bottleneckMode === value ? 'bg-white text-red-800 shadow-sm' : 'text-gray-500'}`}>{label}</button>
            ))}
          </div>
          <ChartSwitch value={bottleneckChart} onChange={setBottleneckChart} options={[{ value: 'bar', label: 'Bar' }, { value: 'pie', label: 'Pie' }]} />
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="relative min-w-44 flex-1">
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
            <input value={bottleneckSearch} onChange={event => setBottleneckSearch(event.target.value)} placeholder={`Search ${bottleneckMode}...`} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-red-400" />
          </label>
          <select value={bottleneckSort} onChange={event => setBottleneckSort(event.target.value)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
            <option value="desc">Highest delay</option><option value="asc">Lowest delay</option>
          </select>
        </div>
        <div className="h-56">{bottleneckRows.length ? <RankedChart rows={bottleneckRows} labelKey="office_name" valueKey="dwell_time_hours" chartType={bottleneckChart} datasetLabel={bottleneckMode === 'office' ? 'Average processing time (hours)' : 'Average completion time (hours)'} unit="h" /> : <EmptyState message={`No ${bottleneckMode} data matches the current search.`} />}</div>
      </DashboardCard>
    ),
    inventory: card => (
      <DashboardCard key={card.id} card={card} editMode={editMode} onResize={cycleCardSize} onDragStart={setDraggedId} onDrop={moveCard}
        title="Prescriptive Analytics" subtitle="Current equipment availability and allocation signal."
        icon={<Package className="text-red-700" size={18} />} accent="border-t-red-700">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <SortSelect value={inventorySort} onChange={setInventorySort} highestLabel="Most stock" lowestLabel="Least stock" />
          <ChartSwitch value={inventoryChart} onChange={setInventoryChart} options={[{ value: 'bar', label: 'Bar' }, { value: 'doughnut', label: 'Doughnut' }]} />
        </div>
        <div className="h-48">{inventoryRows.length ? <RankedChart rows={inventoryRows} labelKey="asset_name" valueKey="current_stock" chartType={inventoryChart} datasetLabel="Available units" /> : <EmptyState message="No equipment inventory data available." />}</div>
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-800"><Lightbulb size={13} /> System insight</p>
          <p className="mt-1 text-xs leading-relaxed text-red-900">Prioritize restocking assets with low availability and sustained historical use.</p>
        </div>
      </DashboardCard>
    ),
    traffic: card => (
      <DashboardCard key={card.id} card={card} editMode={editMode} onResize={cycleCardSize} onDragStart={setDraggedId} onDrop={moveCard}
        title="Peak Traffic Periods" subtitle="Document request volume across academic months."
        icon={<Activity className="text-blue-600" size={18} />} accent="border-t-blue-500">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <select value={trafficRange} onChange={event => setTrafficRange(Number(event.target.value))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold sm:w-auto"><option value={6}>6 months</option><option value={12}>12 months</option><option value={24}>24 months</option></select>
          <ChartSwitch value={trafficChart} onChange={setTrafficChart} options={[{ value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }]} />
        </div>
        <div className="h-64">{trafficRows.length ? (trafficChart === 'line' ? <Line data={trafficData} options={trafficOptions} /> : <Bar data={trafficData} options={trafficOptions} />) : <EmptyState message="No document traffic data available." />}</div>
      </DashboardCard>
    ),
    frequency: card => (
      <DashboardCard key={card.id} card={card} editMode={editMode} onResize={cycleCardSize} onDragStart={setDraggedId} onDrop={moveCard}
        title="Frequently Requested" subtitle={frequencyMode === 'documents' ? 'Most transacted document processes.' : 'Most utilized school resources.'}
        icon={<Package className="text-amber-600" size={18} />} accent="border-t-amber-500">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            {[['documents', 'Documents'], ['assets', 'Assets']].map(([value, label]) => <button key={value} type="button" onClick={() => setFrequencyMode(value)} className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${frequencyMode === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{label}</button>)}
          </div>
          <ChartSwitch value={frequencyChart} onChange={setFrequencyChart} options={[{ value: 'bar', label: 'Bar' }, { value: 'doughnut', label: 'Doughnut' }]} />
        </div>
        <div className="mb-3 flex justify-stretch sm:justify-end"><SortSelect value={frequencySort} onChange={setFrequencySort} highestLabel="Most requested" lowestLabel="Least requested" /></div>
        <div className="h-64">{frequencyRows.length ? <RankedChart rows={frequencyRows} labelKey="name" valueKey={frequencyValueKey} chartType={frequencyChart} datasetLabel={frequencyMode === 'documents' ? 'Requests' : 'Recorded uses'} /> : <EmptyState message={`No ${frequencyMode} usage data available.`} />}</div>
      </DashboardCard>
    ),
    forecast: card => (
      <DashboardCard key={card.id} card={card} editMode={editMode} onResize={cycleCardSize} onDragStart={setDraggedId} onDrop={moveCard}
        title="Demand Planning: Vans & Facilities" subtitle="Historical usage with seasonality-validated projections shown as dashed lines."
        icon={<Activity className="text-emerald-600" size={18} />} accent="border-t-emerald-500">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <select value={demandTimeFilter} onChange={event => setDemandTimeFilter(Number(event.target.value))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold sm:w-auto"><option value={3}>3 months</option><option value={6}>6 months</option><option value={9}>9 months</option><option value={12}>12 months</option></select>
          <ChartSwitch value={forecastChart} onChange={setForecastChart} options={[{ value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }]} />
        </div>
        {projectionInfo?.model_note && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
            <strong>Methodology:</strong> {projectionInfo.model_note} Based on {projectionInfo.history_business_days || 0} business days of recorded activity. Weekly-pattern scores — vans: {Number(projectionInfo.vehicle_seasonality_score || 0).toFixed(2)}, facilities: {Number(projectionInfo.facility_seasonality_score || 0).toFixed(2)} (minimum 0.30).
          </div>
        )}
        <div className="h-64">{chartReadyDemandData?.length ? (forecastChart === 'line' ? <Line data={forecastData} options={forecastChartOptions} /> : <Bar data={forecastData} options={forecastChartOptions} />) : <EmptyState message="No booking history is available for demand planning." />}</div>
      </DashboardCard>
    ),
    routing: card => (
      <DashboardCard key={card.id} card={card} editMode={editMode} onResize={cycleCardSize} onDragStart={setDraggedId} onDrop={moveCard}
        title="Document Routing Efficiency" subtitle="End-to-end turnaround, active processing, and route complexity by process."
        icon={<Zap className="text-violet-600" size={18} />} accent="border-t-violet-500">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <SortSelect value={routingSort} onChange={setRoutingSort} highestLabel="Longest first" lowestLabel="Shortest first" />
          <ChartSwitch value={routingView} onChange={setRoutingView} options={[{ value: 'bar', label: 'Bar' }, { value: 'table', label: 'Table' }]} />
        </div>
        <div className="h-64 overflow-auto">
          {!routes.length ? <EmptyState message="No completed document routes available." /> : routingView === 'bar' ? <RankedChart rows={routes.slice(0, 8)} labelKey="route_name" valueKey="avg_completion_hours" chartType="bar" datasetLabel="End-to-end hours" unit="h" /> : (
            <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-gray-50 text-[10px] uppercase text-gray-500"><tr><th className="p-2">Process</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Active</th><th className="p-2 text-right">Stops</th></tr></thead><tbody>{routes.map(route => <tr key={route.route_name} className="border-t border-gray-100"><td className="p-2 font-semibold text-gray-800">{route.route_name}</td><td className="p-2 text-right">{route.avg_completion_hours}h</td><td className="p-2 text-right">{route.avg_active_processing_hours}h</td><td className="p-2 text-right">{route.avg_stops}</td></tr>)}</tbody></table>
          )}
        </div>
      </DashboardCard>
    ),
    vehicles: card => (
      <DashboardCard key={card.id} card={card} editMode={editMode} onResize={cycleCardSize} onDragStart={setDraggedId} onDrop={moveCard}
        title="Van Turnaround" subtitle="Trip volume and average vehicle turnaround."
        icon={<Truck className="text-cyan-700" size={18} />} accent="border-t-cyan-600">
        <div className="mb-3 flex justify-stretch sm:justify-end"><SortSelect value={vehicleSort} onChange={setVehicleSort} highestLabel="Longest first" lowestLabel="Shortest first" /></div>
        <div className="h-64 space-y-2 overflow-auto pr-1">{vehicles.length ? vehicles.map(item => <div key={item.asset_name} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-gray-900">{item.asset_name}</p><p className="mt-1 text-[10px] uppercase text-gray-500">{item.total_trips} trips</p></div><span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-black text-cyan-800 shadow-sm">{item.avg_turnaround_hours}h</span></div>) : <EmptyState message="No completed van trips available." />}</div>
      </DashboardCard>
    )
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-left">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:flex-row lg:items-center">
        <div><h2 className="text-2xl font-bold tracking-tight text-gray-900">Operational Analytics</h2><p className="mt-1 text-sm text-gray-500">Actionable administrative insights and resource planning.</p></div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
          <div className="flex w-full flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1.5 sm:w-auto sm:flex-row sm:items-center"><input type="date" value={auditStartDate} onChange={event => setAuditStartDate(event.target.value)} className="min-w-0 bg-transparent px-1 py-1 text-xs font-medium outline-none" /><span className="hidden text-xs text-gray-400 sm:inline">–</span><input type="date" value={auditEndDate} onChange={event => setAuditEndDate(event.target.value)} className="min-w-0 bg-transparent px-1 py-1 text-xs font-medium outline-none" /></div>
          <button type="button" onClick={() => setEditMode(value => !value)} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold ${editMode ? 'border-red-200 bg-red-50 text-red-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>{editMode ? <Check size={15} /> : <Settings size={15} />}{editMode ? 'Done' : 'Customize layout'}</button>
          {editMode && <button type="button" onClick={resetLayout} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"><RotateCcw size={14} /> Reset</button>}
          <button type="button" onClick={handleGenerateAuditReport} className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-800"><Download size={15} /> Generate report</button>
        </div>
      </div>

      {editMode && <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-900">Drag cards to reorder them. Use the resize button on each card to cycle through one-, two-, and three-column widths. Your layout is saved on this device.</div>}

      {isAnalyticsLoading ? <div className="flex h-96 items-center justify-center text-sm font-bold text-gray-500">Loading analytics…</div> : <>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className={`flex items-center justify-between rounded-2xl border border-t-4 bg-white p-5 shadow-sm ${isDbHealthy ? 'border-t-emerald-500' : 'border-t-red-600'}`}><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Database connection</p><p className={`mt-2 text-sm font-black ${isDbHealthy ? 'text-emerald-700' : 'text-red-700'}`}>{systemHealth?.database_connection || 'UNKNOWN'}</p></div><Database className={isDbHealthy ? 'text-emerald-600' : 'text-red-600'} size={24} /></div>
          <div className="flex items-center justify-between rounded-2xl border border-t-4 border-t-blue-500 bg-white p-5 shadow-sm"><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Data integrity score</p><p className="mt-1 text-2xl font-black text-gray-900">{systemHealth?.data_quality_audit?.integrity_score_percentage || 0}%</p></div><ShieldCheck className="text-blue-600" size={24} /></div>
          <div className="flex items-center justify-between rounded-2xl border border-t-4 border-t-amber-500 bg-white p-5 shadow-sm"><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Records scanned</p><p className="mt-1 text-2xl font-black text-gray-900">{systemHealth?.data_quality_audit?.audit_details?.total_records_scanned || 0}</p></div><Search className="text-amber-600" size={24} /></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">{layout.map(card => contents[card.id]?.(card))}</div>
      </>}
    </div>
  );
}
