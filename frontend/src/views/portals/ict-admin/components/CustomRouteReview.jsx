import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Search, X } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../../../../api';
import { createRealtimeClient } from '../../../../utils/realtimeClient';

const PAGE_SIZE = 8;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;
const statusLabels = { custom: 'Pending review', official: 'Approved', declined: 'Kept private' };

function RouteRequestModal({ request, onClose, onReview, busy }) {
  const [processName, setProcessName] = useState(() => request?.process_name || '');
  const [error, setError] = useState('');
  if (!request) return null;
  const pending = request.route_status === 'custom';
  const review = async decision => {
    setError('');
    try { await onReview(request, decision, processName); onClose(); }
    catch (reviewError) { setError(reviewError.message || 'Unable to save the review.'); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="route-request-title" className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/30 bg-white text-left shadow-2xl"><header className="flex items-start justify-between bg-[#8c1023] px-6 py-5 text-white"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Additional routing</p><h2 id="route-request-title" className="mt-1 text-xl font-black">Routing request details</h2></div><button type="button" onClick={onClose} aria-label="Close routing request details" className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"><X size={22} /></button></header><div className="overflow-y-auto p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Requested workflow</p><p className="mt-1 text-lg font-black text-neutral-900">{request.process_name}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-black ${pending ? 'bg-amber-100 text-amber-800' : request.route_status === 'official' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'}`}>{statusLabels[request.route_status] || request.route_status}</span></div><dl className="mt-6 grid gap-4 sm:grid-cols-2"><div><dt className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Document type</dt><dd className="mt-1 text-sm font-semibold text-neutral-800">{request.category_name}</dd></div><div><dt className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Submitted by</dt><dd className="mt-1 text-sm font-semibold text-neutral-800">{request.submitter_name || 'Unknown user'}</dd></div></dl><div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4"><p className="text-[11px] font-black uppercase tracking-wider text-neutral-500">Requested office sequence</p><div className="mt-3 flex flex-wrap items-center gap-2">{request.route_names.map((name, index) => <span key={`${name}-${index}`} className="inline-flex items-center gap-2"><span className="rounded-lg border border-rose-100 bg-white px-3 py-1.5 text-sm font-bold text-neutral-800">{index + 1}. {name}</span>{index < request.route_names.length - 1 && <span className="text-[#8c1023]">→</span>}</span>)}</div></div>{pending && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4"><label className="block text-sm font-bold text-neutral-800" htmlFor="official-workflow-name">Workflow name if approved<input id="official-workflow-name" required maxLength={100} value={processName} onChange={event => setProcessName(event.target.value)} className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#8c1023] focus:ring-2 focus:ring-rose-100" /></label><p className="mt-2 text-xs text-neutral-600">Approval makes this workflow available to eligible users. Keeping it private does not interrupt documents already using it.</p></div>}{error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p>}</div>{pending && <footer className="flex flex-wrap justify-end gap-3 border-t border-neutral-100 px-6 py-4"><button type="button" disabled={busy} onClick={() => review('decline')} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60">Keep private</button><button type="button" disabled={busy || !processName.trim()} onClick={() => review('approve')} className="rounded-lg bg-[#8c1023] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#700b1c] disabled:opacity-60">Approve workflow</button></footer>} {!pending && <footer className="flex justify-end border-t border-neutral-100 px-6 py-4"><button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50">Close</button></footer>}</section></div>;
}

export default function CustomRouteReview({ onChanged }) {
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('custom');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/custom-routes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoutes(data);
      setError('');
    } catch (loadError) { setError(loadError.message || 'Unable to load additional routing requests.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(load, 0);
    return () => window.clearTimeout(loadTimer);
  }, [load]);
  useEffect(() => {
    const socket = createRealtimeClient(SOCKET_URL, { secure: true, reconnection: true });
    const subscribe = () => socket.emit('join-ict-admin-room');
    socket.on('connect', subscribe);
    socket.on('admin-configuration-updated', load);
    return () => socket.disconnect();
  }, [load]);

  const visibleRoutes = useMemo(() => routes.filter(route => {
    const matchesFilter = filter === 'all' || route.route_status === filter;
    const needle = query.trim().toLowerCase();
    const matchesSearch = !needle || [route.process_name, route.category_name, route.submitter_name, ...(route.route_names || [])].some(value => String(value || '').toLowerCase().includes(needle));
    return matchesFilter && matchesSearch;
  }), [routes, filter, query]);
  const pageCount = Math.max(1, Math.ceil(visibleRoutes.length / PAGE_SIZE));
  const displayedRoutes = visibleRoutes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const review = async (route, decision, processName) => {
    setBusy(true);
    try {
      const res = await fetchWithAuth(`/api/custom-routes/${route.p_id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, processName }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load();
      await onChanged();
    } finally { setBusy(false); }
  };

  return <section aria-labelledby="additional-routing-heading"><div className="flex flex-col gap-3 border-b border-neutral-100 pb-4 md:flex-row md:items-end md:justify-between"><div><h3 id="additional-routing-heading" className="text-lg font-black text-neutral-900">Additional routing requests</h3><p className="mt-1 text-sm text-neutral-500">Review requested office sequences before making them available as document workflows.</p></div><span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800">{routes.filter(route => route.route_status === 'custom').length} pending</span></div><div className="mt-4 flex flex-col gap-3 md:flex-row"><label className="relative block flex-1" htmlFor="routing-search"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><span className="sr-only">Search additional routing requests</span><input id="routing-search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Search requests…" className="w-full rounded-lg border border-neutral-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#8c1023] focus:ring-2 focus:ring-rose-100" /></label><select aria-label="Filter additional routing requests" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }} className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm"><option value="custom">Pending review</option><option value="official">Approved</option><option value="declined">Kept private</option><option value="all">All requests</option></select></div>{error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" onClick={load} className="font-bold underline">Try again</button></p>}<div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">{loading ? <p role="status" className="p-8 text-center text-sm text-neutral-500">Loading routing requests…</p> : <table className="w-full min-w-[760px] text-sm"><thead className="bg-neutral-50 text-left text-[11px] uppercase tracking-wider text-neutral-500"><tr><th className="px-5 py-4 font-black">Requested workflow</th><th className="px-5 py-4 font-black">Document type</th><th className="px-5 py-4 font-black">Submitted by</th><th className="px-5 py-4 font-black">Status</th><th className="px-5 py-4 text-right font-black">Actions</th></tr></thead><tbody className="divide-y divide-neutral-100">{displayedRoutes.map(route => <tr key={route.p_id} onClick={() => setSelected(route)} className="cursor-pointer hover:bg-rose-50/40"><td className="px-5 py-4 font-bold text-neutral-900">{route.process_name}</td><td className="px-5 py-4 text-neutral-600">{route.category_name}</td><td className="px-5 py-4 text-neutral-600">{route.submitter_name || 'Unknown user'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${route.route_status === 'custom' ? 'bg-amber-100 text-amber-800' : route.route_status === 'official' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'}`}>{statusLabels[route.route_status] || route.route_status}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={event => { event.stopPropagation(); setSelected(route); }} className="inline-flex items-center gap-1 text-xs font-bold text-[#8c1023] underline"><Eye size={14} /> View details</button></td></tr>)}{!displayedRoutes.length && <tr><td colSpan="5" className="px-5 py-12 text-center text-sm text-neutral-500">No routing requests match this search or filter.</td></tr>}</tbody></table>}</div>{visibleRoutes.length > PAGE_SIZE && <div className="flex items-center justify-between pt-4 text-sm text-neutral-600"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} className="rounded-lg border border-neutral-300 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={17} /></button><button type="button" onClick={() => setPage(page + 1)} disabled={page === pageCount} className="rounded-lg border border-neutral-300 p-1.5 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={17} /></button></div></div>}<RouteRequestModal key={selected?.p_id || 'closed'} request={selected} onClose={() => setSelected(null)} onReview={review} busy={busy} /></section>;
}
