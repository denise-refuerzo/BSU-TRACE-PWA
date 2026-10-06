import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, FileText, RefreshCw, Search } from 'lucide-react';
import { fetchWithAuth } from '../../../api';
import { formatPhilippineDateTime } from '../../../utils/philippineTime';
import DocumentTrackingModal from '../modals/DocumentTrackingModal';
import PaginationControls from './PaginationControls';
import { createRealtimeClient } from '../../../utils/realtimeClient';

const PAGE_SIZE = 5;
const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://bsu-trace-pwa.onrender.com';

export default function CollaborativeSubmissionsTab({ mode = 'shared', onOpenChat }) {
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/collaboration/${mode}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDocuments(data);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Unable to load submissions.');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return undefined;
    const socket = createRealtimeClient(SOCKET_URL, { reconnection: true });
    const connect = () => socket.emit('join-user-room', userId);
    socket.on('connect', connect);
    socket.on('document-updated', load);
    return () => socket.disconnect();
  }, [load]);

  const filtered = useMemo(() => documents.filter(document =>
    `${document.title} ${document.qr_code} ${document.submitted_by}`.toLowerCase().includes(search.toLowerCase())), [documents, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);

  const restore = async (event, document) => {
    event.stopPropagation();
    const response = await fetchWithAuth(`/api/collaboration/documents/${document.ini_id}/archive`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) return setError(data.error || 'Unable to restore the submission.');
    if (selected?.ini_id === document.ini_id) setSelected(null);
    load();
  };

  const archived = mode === 'archived';
  return (
    <div className="mx-auto max-w-8xl space-y-5 text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-xs font-medium text-neutral-500 dark:text-gray-400">{archived ? 'Your personal archive. Other owners and collaborators are unaffected.' : 'Viewer access: view, track, and chat without changing the submitted record.'}</p>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-neutral-400" size={15}/>
          <input 
            value={search} 
            onChange={event => { setSearch(event.target.value); setPage(1); }} 
            placeholder="Search submissions" 
            className="w-full rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] py-2 pl-9 pr-3 text-xs text-neutral-900 dark:text-white outline-none focus:border-red-800 sm:w-64"
          />
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-3 text-xs font-semibold text-red-800 dark:text-red-300">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-[#42292f] bg-white dark:bg-[#180e10] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-[#42292f] bg-neutral-50 dark:bg-[#2b1317] text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-gray-400">
                <th className="p-4">Document</th>
                <th className="p-4">Submitted by</th>
                <th className="p-4">Current status</th>
                <th className="p-4">Updated</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-gray-800/50">
              {pageRows.map(document => (
                <tr key={document.ini_id} onClick={() => setSelected(document)} className="cursor-pointer hover:bg-red-50/30 dark:hover:bg-[#2b1317]/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-neutral-100 dark:bg-gray-800 p-2 text-neutral-600 dark:text-gray-300">
                        <FileText size={16}/>
                      </span>
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white">{document.title}</p>
                        <p className="mt-1 font-mono text-[10px] text-neutral-500 dark:text-gray-400">{document.qr_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-semibold text-neutral-700 dark:text-gray-300">{document.submitted_by}</td>
                  <td className="p-4">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${document.status?.toLowerCase()==='completed'?'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400':document.status?.toLowerCase()==='cancelled'?'border-neutral-300 dark:border-gray-700 bg-neutral-100 dark:bg-gray-800 text-neutral-700 dark:text-gray-300':'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                      {document.status || 'Pending'}
                    </span>
                    <p className="mt-2 text-[10px] text-neutral-500 dark:text-gray-400">{document.current_office || 'Processing complete'}</p>
                  </td>
                  <td className="p-4 text-xs text-neutral-500 dark:text-gray-400">{formatPhilippineDateTime(document.archived_at || document.created_at)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={event => { event.stopPropagation(); setSelected(document); }} className="trace-button dark:bg-[#1c1113] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#2b1317]">
                        <Eye size={14}/>View
                      </button>
                      {archived && (
                        <button onClick={event => restore(event, document)} className="trace-button dark:bg-[#1c1113] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#2b1317]">
                          <RefreshCw size={14}/>Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !filtered.length && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-sm text-neutral-500 dark:text-gray-400">
                    {archived ? 'Your archive is empty.' : 'No submissions have been shared with you.'}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-sm text-neutral-500 dark:text-gray-400">
                    Loading submissions…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls page={visiblePage} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} pageSize={PAGE_SIZE}/>
      </div>

      {selected && (
        <DocumentTrackingModal 
          selectedDoc={selected} 
          readOnly 
          onClose={() => setSelected(null)} 
          onRefresh={load} 
          onOpenChat={onOpenChat}
        />
      )} 
    </div>
  );
}