import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, FileText, Landmark, MapPin, Search, X } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../../../api';
import { createRealtimeClient } from '../../../utils/realtimeClient';

export default function SubmissionOverviewTab({ type, scopes }) {
  const [selectedId, setSelectedId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const isOffice = type === 'office';
  const scopeIdKey = isOffice ? 'office_id' : 'department_id';
  const scopeNameKey = isOffice ? 'office_name' : 'department_name';

  const effectiveId = scopes.some(scope => String(scope[scopeIdKey]) === String(selectedId))
    ? selectedId
    : scopes[0]?.[scopeIdKey] || '';

  const load = useCallback(async () => {
    if (!effectiveId) return;
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/submission-overview?type=${type}&id=${effectiveId}`);
      const data = await response.json();
      if (response.ok) setDocuments(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [effectiveId, type]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const socket = createRealtimeClient(API_BASE_URL, { secure: true, reconnection: true });
    const subscribe = () => socket.emit('join-submission-overview-rooms');
    socket.on('connect', subscribe);
    socket.on('submission-overview-updated', load);
    return () => socket.disconnect();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter(document => [document.title, document.submitted_by, document.process_name, document.current_status]
      .some(value => String(value || '').toLowerCase().includes(needle)));
  }, [documents, query]);

  const title = `${isOffice ? 'Office' : 'Department'} Submissions`;
  const Icon = isOffice ? Building2 : Landmark;

  return <div className="mx-auto max-w-7xl space-y-5 text-left animate-in fade-in duration-200">
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900"><Icon className="text-red-700" size={23} /> {title}</h2>
      <p className="mt-1 text-sm text-gray-500">View documents submitted by staff in the {isOffice ? 'offices' : 'departments'} assigned to you.</p>
    </div>
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row">
        <select value={effectiveId} onChange={event => setSelectedId(event.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 sm:min-w-72">
          {scopes.map(scope => <option key={scope[scopeIdKey]} value={scope[scopeIdKey]}>{scope[scopeNameKey]}</option>)}
        </select>
        <label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search submissions..." className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-red-700" /></label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-red-50/60 text-[11px] uppercase tracking-wide text-red-900"><tr><th className="px-5 py-3">Document</th><th className="px-5 py-3">Submitted by</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Submitted</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{visible.map(document => <tr key={document.ini_id} onClick={() => setSelectedDocument(document)} className="cursor-pointer hover:bg-gray-50/70"><td className="px-5 py-4"><p className="flex items-center gap-2 font-bold text-gray-900"><FileText size={15} className="text-red-700" /> {document.title}</p></td><td className="px-5 py-4"><p className="font-semibold text-gray-800">{document.submitted_by}</p><p className="text-xs text-gray-500">{document.office_name || document.department_name || 'No affiliation listed'}</p></td><td className="px-5 py-4 text-gray-600">{document.process_name}</td><td className="px-5 py-4"><span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase text-gray-700">{document.current_status}</span></td><td className="px-5 py-4 whitespace-nowrap text-gray-500">{new Date(document.created_at).toLocaleDateString()}</td></tr>)}</tbody>
        </table>
      </div>
      {!loading && visible.length === 0 && <p className="p-10 text-center text-sm text-gray-500">No submissions found for this area.</p>}
      {loading && <p className="p-10 text-center text-sm text-gray-500">Loading submissions...</p>}
    </div>
    {selectedDocument && <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/55 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && setSelectedDocument(null)}>
      <section role="dialog" aria-modal="true" aria-labelledby="overview-document-title" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/30 bg-white text-left shadow-2xl">
        <header className="flex items-center justify-between gap-3 bg-red-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-white/15 p-2"><FileText size={20} /></span><div><p className="text-[10px] uppercase tracking-[.18em] text-white/70">Submission overview</p><h2 id="overview-document-title" className="font-bold">Document Details</h2></div></div>
          <button type="button" onClick={() => setSelectedDocument(null)} aria-label="Close document details" className="rounded-full p-2 hover:bg-white/15"><X size={19} /></button>
        </header>
        <div className="space-y-5 p-5 sm:p-6">
          <div><span className="inline-flex rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase text-red-900">{selectedDocument.current_status}</span><h3 className="mt-3 text-xl font-black text-gray-900">{selectedDocument.title}</h3><p className="mt-1 text-sm text-gray-500">{selectedDocument.process_name}</p></div>
          <dl className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs font-bold uppercase tracking-wide text-gray-400">Submitted by</dt><dd className="mt-1 font-semibold text-gray-800">{selectedDocument.submitted_by}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-gray-400">Assigned area</dt><dd className="mt-1 font-semibold text-gray-800">{selectedDocument.office_name || selectedDocument.department_name || 'Not listed'}</dd></div>
            <div><dt className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-400"><CalendarDays size={13} /> Submitted</dt><dd className="mt-1 text-gray-700">{new Date(selectedDocument.created_at).toLocaleString()}</dd></div>
            <div><dt className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-400"><CalendarDays size={13} /> Estimated completion</dt><dd className="mt-1 text-gray-700">{selectedDocument.edc ? new Date(selectedDocument.edc).toLocaleDateString() : 'Not available'}</dd></div>
            <div><dt className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-400"><MapPin size={13} /> Current office</dt><dd className="mt-1 text-gray-700">{selectedDocument.current_office || 'Not yet assigned'}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-gray-400">Next office</dt><dd className="mt-1 text-gray-700">{selectedDocument.next_office || 'None listed'}</dd></div>
          </dl>
          <p className="text-xs text-gray-500">This overview is read-only. Processing history, QR downloads, workflow actions, and chat are not available here.</p>
        </div>
        <footer className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-4"><button type="button" onClick={() => setSelectedDocument(null)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100">Close</button></footer>
      </section>
    </div>}
  </div>;
}
