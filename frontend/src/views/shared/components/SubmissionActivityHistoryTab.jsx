import { useEffect, useMemo, useState } from 'react';
import { Eye, Filter, Search } from 'lucide-react';
import { fetchWithAuth } from '../../../api';
import { formatPhilippineDateTime } from '../../../utils/philippineTime';
import PaginationControls from './PaginationControls';
import DocumentTrackingModal from '../modals/DocumentTrackingModal';

const PAGE_SIZE = 7;

export default function SubmissionActivityHistoryTab({ includeOfficeActivity = false, onOpenChat }) {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    fetchWithAuth('/api/collaboration/history').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEvents(data);
    }).catch(loadError => setError(loadError.message)).finally(() => setLoading(false));
  }, []);
  const rows = useMemo(() => events.filter(event => {
    const matchesSearch = `${event.title} ${event.qr_code} ${event.actor_name} ${event.activity_type}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (category === 'all' || event.event_category === category);
  }), [events, search, category]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const describe = event => event.details?.reason ? `${event.activity_type}: ${event.details.reason}` : event.details?.collaboratorName ? `${event.activity_type}: ${event.details.collaboratorName}` : event.details?.office ? `${event.activity_type} · ${event.details.office}` : event.activity_type;
  return <div className="mx-auto max-w-8xl space-y-5 text-left"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><p className="text-xs font-medium text-neutral-500">A permanent trail of office processing, submission activity, access changes, and document conversations.</p><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Filter className="absolute left-3 top-2.5 text-neutral-400" size={15}/><select value={category} onChange={event => { setCategory(event.target.value); setPage(1); }} className="w-full appearance-none rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-8 text-xs outline-none focus:border-red-800"><option value="all">All activity</option>{includeOfficeActivity&&<option value="office">Office processing</option>}<option value="submission">My submissions</option><option value="access">Collaboration & access</option><option value="chat">Chat activity</option></select></label><label className="relative"><Search className="absolute left-3 top-2.5 text-neutral-400" size={15}/><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search history" className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-xs outline-none focus:border-red-800 sm:w-64"/></label></div></div>{error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{error}</p>}<div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead><tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-black uppercase tracking-wider text-neutral-500"><th className="p-4">Date and time</th><th className="p-4">Document</th><th className="p-4">Actor</th><th className="p-4">Activity</th><th className="p-4 text-right">Details</th></tr></thead><tbody className="divide-y divide-neutral-100">{pageRows.map(event=><tr key={`${event.event_source}-${event.event_id}`}><td className="p-4 whitespace-nowrap text-xs text-neutral-500">{formatPhilippineDateTime(event.occurred_at)}</td><td className="p-4"><p className="font-bold text-neutral-900">{event.title}</p><p className="mt-1 font-mono text-[10px] text-neutral-500">{event.qr_code} · {event.relationship_label}</p></td><td className="p-4 text-xs font-semibold text-neutral-700">{event.actor_name}</td><td className="p-4 text-xs text-neutral-700"><span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-red-800">{event.event_category}</span>{describe(event)}</td><td className="p-4 text-right"><button onClick={() => setSelected(event)} className="trace-button"><Eye size={14}/>View</button></td></tr>)}{!loading&&!rows.length&&<tr><td colSpan="5" className="p-12 text-center text-sm text-neutral-500">No matching history entries.</td></tr>}{loading&&<tr><td colSpan="5" className="p-12 text-center text-sm text-neutral-500">Loading history…</td></tr>}</tbody></table></div><PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} totalItems={rows.length} pageSize={PAGE_SIZE}/></div>{selected&&<DocumentTrackingModal selectedDoc={selected} readOnly isHistoryDetails onClose={() => setSelected(null)} onOpenChat={onOpenChat}/>}</div>;
}
