import { useMemo, useState } from 'react';
import { CheckSquare, FileText, Square, X } from 'lucide-react';
import { fetchWithAuth } from '../../../api';

const GSO_SECTIONS = [
  { id: 'processing', label: 'Processing Delay Analysis', description: 'Average completed-document dwell time by office.' },
  { id: 'traffic', label: 'Peak Traffic Periods', description: 'Document request volume by month.' },
  { id: 'frequent', label: 'Frequently Requested Documents & Resources', description: 'Most-used document processes and school resources.' },
  { id: 'inventory', label: 'Resource Inventory', description: 'Current equipment capacity and availability snapshot.', snapshot: true },
  { id: 'demand', label: 'Demand Planning', description: 'Historical and projected van and facility demand.' },
  { id: 'routing', label: 'Document Routing Efficiency', description: 'End-to-end and active processing duration by process.' },
  { id: 'vehicles', label: 'Van Turnaround', description: 'Trip totals and average turnaround by van.' },
  { id: 'system', label: 'System Health Summary', description: 'Current database status and records scanned.', snapshot: true }
];

const ICT_SECTIONS = [
  GSO_SECTIONS[0],
  GSO_SECTIONS[1],
  { id: 'frequent', label: 'Frequently Requested Documents', description: 'Most-used document processes.' },
  GSO_SECTIONS[5],
  GSO_SECTIONS[7]
];

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const number = (value, digits = 2) => Number(value || 0).toFixed(digits);
const row = cells => `<tr>${cells.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
const emptyRow = columns => `<tr><td colspan="${columns}" class="empty">No records matched the selected range.</td></tr>`;
const section = (numberLabel, title, note, headers, rows) => `
  <section class="report-section">
    <h2>${numberLabel}. ${escapeHtml(title)}</h2>
    ${note ? `<p class="section-note">${escapeHtml(note)}</p>` : ''}
    <table><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.join('') : emptyRow(headers.length)}</tbody></table>
  </section>`;

export default function AnalyticsReportModal({
  open,
  onClose,
  scope = 'gso',
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  data
}) {
  const sections = scope === 'ict' ? ICT_SECTIONS : GSO_SECTIONS;
  const [selected, setSelected] = useState(() => sections.map(item => item.id));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const closeModal = () => {
    setSelected(sections.map(item => item.id));
    setError('');
    onClose();
  };

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  if (!open) return null;

  const toggle = id => setSelected(current => current.includes(id)
    ? current.filter(item => item !== id)
    : [...current, id]);

  const generateReport = async () => {
    if (!selected.length) {
      setError('Select at least one report section.');
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setError('The start date must be before or equal to the end date.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Allow pop-ups for this site to generate the report.');
      return;
    }
    printWindow.document.write('<p style="font-family:sans-serif;padding:2rem">Preparing analytics report…</p>');
    setGenerating(true);
    setError('');

    try {
      const query = new URLSearchParams();
      if (startDate) query.set('start', startDate);
      if (endDate) query.set('end', endDate);
      const suffix = query.size ? `?${query.toString()}` : '';
      const needsProcessing = selectedSet.has('processing');
      const needsRoutes = selectedSet.has('routing') || selectedSet.has('vehicles');
      const needsInsights = selectedSet.has('traffic') || selectedSet.has('frequent');

      const [bottleneckResponse, routeResponse, insightsResponse] = await Promise.all([
        needsProcessing ? fetchWithAuth(`/api/analytics/bottlenecks${suffix}`) : null,
        needsRoutes ? fetchWithAuth(`/api/analytics/route-performance${suffix}`) : null,
        needsInsights ? fetchWithAuth(`/api/analytics/administrative-insights${suffix}`) : null
      ]);
      const responses = [bottleneckResponse, routeResponse, insightsResponse].filter(Boolean);
      if (responses.some(response => !response.ok)) throw new Error('One or more selected analytics sections could not be loaded.');

      const bottlenecks = bottleneckResponse ? await bottleneckResponse.json() : [];
      const routes = routeResponse ? await routeResponse.json() : { document_routes: [], vehicle_scheduling: [] };
      const insights = insightsResponse ? await insightsResponse.json() : { peak_traffic: [], frequent_documents: [], utilized_assets: [] };
      const demandRows = (data.peakDemandData || []).filter(item => (
        (!startDate || item.date >= startDate) && (!endDate || item.date <= endDate)
      ));
      const reportSections = [];
      let index = 1;

      if (selectedSet.has('processing')) reportSections.push(section(index++, 'Processing Delay Analysis', 'Completed document stops within the selected date range.', ['Office', 'Average processing time'], bottlenecks.map(item => row([item.office_name, `${number(item.dwell_time_hours)} hours`]))));
      if (selectedSet.has('traffic')) reportSections.push(section(index++, 'Peak Traffic Periods', 'Document submissions within the selected date range.', ['Month', 'Requests'], (insights.peak_traffic || []).map(item => row([item.month, item.request_count]))));
      if (selectedSet.has('frequent')) {
        const frequentRows = (insights.frequent_documents || []).map(item => row(['Document', item.name, item.request_count]));
        if (scope === 'gso') frequentRows.push(...(insights.utilized_assets || []).map(item => row(['Resource', item.name, item.usage_count])));
        reportSections.push(section(index++, scope === 'ict' ? 'Frequently Requested Documents' : 'Frequently Requested Documents & Resources', scope === 'ict' ? 'Document submissions within the selected date range.' : 'Document counts use the selected range; resource utilization is a current cumulative measure.', ['Type', 'Name', 'Recorded uses'], frequentRows));
      }
      if (selectedSet.has('inventory')) reportSections.push(section(index++, 'Resource Inventory', `Current snapshot generated ${new Date().toLocaleDateString()}.`, ['Asset', 'Capacity', 'Available'], (data.equipmentInventory || []).map(item => row([item.asset_name, item.capacity, item.current_stock]))));
      if (selectedSet.has('demand')) reportSections.push(section(index++, 'Demand Planning', 'Historical and forecast values that fall within the selected date range.', ['Date', 'Type', 'Expected van requests', 'Expected facility requests'], demandRows.map(item => row([item.date, item.type, number(item.vehicle_demand), number(item.facility_demand)]))));
      if (selectedSet.has('routing')) reportSections.push(section(index++, 'Document Routing Efficiency', 'Documents completed within the selected date range.', ['Process', 'End-to-end', 'Active processing', 'Average stops', 'Documents'], (routes.document_routes || []).map(item => row([item.route_name, `${number(item.avg_completion_hours)}h`, `${number(item.avg_active_processing_hours)}h`, number(item.avg_stops), item.total_documents]))));
      if (selectedSet.has('vehicles')) reportSections.push(section(index++, 'Van Turnaround', 'Trips scheduled within the selected date range.', ['Van', 'Trips', 'Average turnaround'], (routes.vehicle_scheduling || []).map(item => row([item.asset_name, item.total_trips, `${number(item.avg_turnaround_hours)}h`]))));
      if (selectedSet.has('system')) reportSections.push(section(index++, 'System Health Summary', `Current snapshot generated ${new Date().toLocaleString()}.`, ['Metric', 'Value'], [row(['Database connection', data.systemHealth?.database_connection || 'UNKNOWN']), row(['Records scanned', data.systemHealth?.data_quality_audit?.audit_details?.total_records_scanned || 0]) ]));

      const portalLabel = scope === 'ict' ? 'ICT Administration' : 'General Services Office';
      const rangeLabel = startDate || endDate ? `${startDate || 'Earliest record'} to ${endDate || 'Present'}` : 'All available dates';
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(portalLabel)} Operational Analytics Report</title><style>
        @page { size: A4; margin: 16mm; }
        * { box-sizing: border-box; } body { margin: 0; color: #1f2937; font-family: Arial, sans-serif; font-size: 12px; }
        .report-header { border-bottom: 3px solid #991b1b; padding-bottom: 16px; margin-bottom: 24px; }
        h1 { margin: 0; color: #111827; font-size: 24px; } .meta { margin: 10px 0 0; color: #4b5563; line-height: 1.6; }
        .report-section { break-inside: auto; page-break-inside: auto; margin: 0 0 28px; }
        h2 { break-after: avoid; page-break-after: avoid; color: #7f1d1d; font-size: 17px; margin: 0; padding-bottom: 7px; border-bottom: 1px solid #d1d5db; }
        .section-note { break-after: avoid; page-break-after: avoid; margin: 7px 0 0; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        thead { display: table-header-group; } tr { break-inside: avoid; page-break-inside: avoid; }
        th { background: #f3f4f6; color: #374151; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
        th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; } tbody tr:nth-child(even) { background: #fafafa; }
        .empty { color: #6b7280; text-align: center; padding: 18px; } .report-footer { margin-top: 30px; border-top: 1px solid #d1d5db; padding-top: 10px; color: #6b7280; font-size: 10px; }
      </style></head><body><header class="report-header"><h1>BSU-Trace Operational Analytics Report</h1><div class="meta"><strong>Portal:</strong> ${escapeHtml(portalLabel)}<br><strong>Date range:</strong> ${escapeHtml(rangeLabel)}<br><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</div></header>${reportSections.join('')}<footer class="report-footer">Generated by BSU-Trace. Current-state sections are identified as snapshots and are not constrained by the historical date range.</footer></body></html>`);
      printWindow.document.close();
      setTimeout(() => { printWindow.focus(); printWindow.print(); }, 400);
      closeModal();
    } catch (generationError) {
      printWindow.close();
      setError(generationError.message || 'The report could not be generated.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="analytics-report-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
          <div><h2 id="analytics-report-title" className="flex items-center gap-2 text-lg font-black text-gray-900"><FileText className="text-red-700" size={20} /> Build Analytics Report</h2><p className="mt-1 text-xs text-gray-500">Choose a date range and one or more report sections.</p></div>
          <button type="button" onClick={closeModal} aria-label="Close report builder" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={20} /></button>
        </header>
        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-gray-700">Start date<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label><label className="text-xs font-bold text-gray-700">End date<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" /></label></div>
          <div className="mt-5 flex items-center justify-between"><h3 className="text-sm font-black text-gray-900">Report sections</h3><div className="flex gap-2"><button type="button" onClick={() => setSelected(sections.map(item => item.id))} className="text-xs font-bold text-red-700 hover:underline">Select all</button><span className="text-gray-300">|</span><button type="button" onClick={() => setSelected([])} className="text-xs font-bold text-gray-600 hover:underline">Clear</button></div></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{sections.map(item => { const checked = selectedSet.has(item.id); return <button key={item.id} type="button" onClick={() => toggle(item.id)} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${checked ? 'border-red-200 bg-red-50/70' : 'border-gray-200 hover:bg-gray-50'}`}>{checked ? <CheckSquare className="mt-0.5 shrink-0 text-red-700" size={18} /> : <Square className="mt-0.5 shrink-0 text-gray-400" size={18} />}<span><span className="block text-xs font-bold text-gray-900">{item.label}</span><span className="mt-1 block text-[11px] leading-relaxed text-gray-500">{item.description}{item.snapshot ? ' Date range does not apply.' : ''}</span></span></button>; })}</div>
          {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        </div>
        <footer className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4 sm:px-6"><button type="button" onClick={closeModal} className="rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50">Cancel</button><button type="button" disabled={generating || !selected.length} onClick={generateReport} className="rounded-lg bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">{generating ? 'Generating…' : `Generate ${selected.length} section${selected.length === 1 ? '' : 's'}`}</button></footer>
      </section>
    </div>
  );
}
