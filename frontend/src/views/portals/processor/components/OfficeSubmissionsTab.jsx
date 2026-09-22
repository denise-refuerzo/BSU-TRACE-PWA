import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchWithAuth } from '../../../../api';
import { io } from 'socket.io-client';
import DocumentSubmissionModal from '../../originator/modals/DocumentSubmissionModal';
import OfficeDocumentModal from '../../../shared/modals/DocumentTrackingModal';
import { formatPhilippineDateTime, formatPhilippineDate } from '../../../../utils/philippineTime';
import { Search, Plus, AlertCircle, X, FileText, RefreshCw, Inbox, Filter, MoreVertical } from 'lucide-react';

const SOCKET_URL = 'https://bsu-trace-pwa.onrender.com';

export default function OfficeSubmissionsTab({ officeId, onProcessed = () => {} }) {
  const userId = localStorage.getItem('userId');

  // --- STATE ---
  const [estimateBase, setEstimateBase] = useState(() => Date.now());
  const [documents, setDocuments] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDocsLoading, setIsDocsLoading] = useState(true);
  const [error, setError] = useState('');
  const [workflowError, setWorkflowError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [revision, setRevision] = useState(null);
  const [busy, setBusy] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [predictions, setPredictions] = useState([]);
  const [customHours, setCustomHours] = useState(null);
  const [form, setForm] = useState({ title: '', processTypeId: '', confirmation: false, completeOriginProcessing: false });

  // --- OPTIMIZATION: Search Debouncing ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // --- DATA FETCHING ---
  const load = useCallback(() => fetchWithAuth(`/api/documents/${userId}`).then(async res => {
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }).then(data => { setDocuments(data); setError(''); }).catch(err => setError(err.message)).finally(() => setIsDocsLoading(false)), [userId]);

  const workflows = useCallback(() => fetchWithAuth('/api/process-types').then(async res => {
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }).then(data => { setProcessTypes(data); setWorkflowError(''); }).catch(err => setWorkflowError(err.message)).finally(() => setLoading(false)), []);

  // --- REAL-TIME WEBSOCKET EFFECT (Replaces setInterval) ---
  useEffect(() => { 
    load(); 
    workflows(); 
    
    if (!officeId) return;

    const socket = io(SOCKET_URL, { 
      secure: true, 
      reconnection: true 
    });
    
    socket.on('connect', () => {
      // Listen to this specific office's updates
      socket.emit('join-office-room', officeId);
    });

    socket.on('pipeline-updated', () => {
      load(); // Instantly refresh table when a document changes
    });

    return () => {
      socket.disconnect();
    };
  }, [officeId, load, workflows]);

  useEffect(() => { 
    let cancelled = false; 
    fetchWithAuth('/api/analytics/edc').then(async res => { 
      if (res.ok) { 
        const data = await res.json(); 
        if (!cancelled && Array.isArray(data)) setPredictions(data); 
      } 
    }).catch(() => {}); 
    return () => { cancelled = true; }; 
  }, []);

  useEffect(() => { 
    let cancelled = false; 
    const ids = form.customRoute?.stops?.filter(Boolean); 
    if (!ids?.length) { 
      setCustomHours(null); 
      return; 
    } 
    fetchWithAuth(`/api/analytics/edc?route=${ids.join(',')}`).then(async r => r.ok ? r.json() : []).then(d => { 
      if (!cancelled) setCustomHours(d[0]?.estimated_hours_to_complete ?? null); 
    }).catch(() => setCustomHours(null)); 
    return () => { cancelled = true; }; 
  }, [form.customRoute?.stops?.join(',')]);

  // --- LOGIC ---
  const process = processTypes.find(p => String(p.p_id) === String(form.processTypeId));
  const eligible = form.customRoute ? Number(form.customRoute.stops[0]) === Number(officeId) : process && Number(process.resolved_origin_office_id) === Number(officeId);
  const hours = Number(predictions.find(p => Number(p.process_id) === Number(form.processTypeId))?.estimated_hours_to_complete);
  const estimate = Number.isFinite(hours) && hours >= 0 ? new Date(estimateBase + hours * 3600000) : null;
  const edc = estimate ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(estimate) : null;
  const customEdc = form.customRoute?.stops?.every(Boolean) && customHours !== null ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + customHours * 3600000)) : null;
  const resolvedEdc = form.customRoute ? customEdc : edc;

  const submit = async e => {
    e.preventDefault(); if (busy) return; if (!resolvedEdc) { setError('Estimated delivery is still being calculated. Complete the route stops first.'); return; } setBusy(true); setError('');
    try {
      const res = await fetchWithAuth('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title, processTypeId: Number(form.processTypeId), customRoute: form.customRoute, edc: resolvedEdc, completeOriginProcessing: Boolean(eligible && form.completeOriginProcessing) }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setShowModal(false); setForm({ title: '', processTypeId: '', confirmation: false, completeOriginProcessing: false });
      await load(); onProcessed(); setSelected({ ini_id: data.iniId });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const resubmit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const res = await fetchWithAuth(`/api/documents/${revision.ini_id}/resubmit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: revision.title }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setRevision(null); await load(); onProcessed();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  // --- UI HELPERS ---
  const getStatusStyles = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('completed') || s.includes('finalized')) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (s.includes('action required') || s.includes('halted')) return 'bg-red-50 text-[#D32F2F] border border-red-200';
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  };

  // --- OPTIMIZATION: Data Memoization ---
  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const matchesSearch = (d.title + ' ' + d.qr_code).toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesFilter = filterStatus === 'All' || d.status?.toLowerCase() === filterStatus.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [documents, debouncedSearch, filterStatus]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Office Submissions</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Manage and track documents submitted by your office.</p>
        </div>
        <button 
          onClick={() => { setEstimateBase(Date.now()); setLoading(true); setShowModal(true); workflows(); }} 
          className="flex items-center justify-center gap-2 bg-[#D32F2F] hover:bg-[#b71c1c] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transform active:scale-95 hover:-translate-y-0.5 transition-[transform,colors] duration-200 w-full sm:w-auto"
        >
          <Plus size={16} /> Submit Document
        </button>
      </div>

      {error && !showModal && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {/* MATRIX TABLE CONTAINER */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col scroll-mt-6">
        
        {/* Table Controls Header */}
        <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              Submitted Documents
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter Dropdown */}
            <div className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus-within:ring-1 focus-within:ring-[#D32F2F] focus-within:border-[#D32F2F] transition-all cursor-pointer w-full sm:w-auto">
              <Filter size={14} className="text-gray-400 shrink-0" />
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)} 
                className="bg-transparent text-xs outline-none cursor-pointer font-medium text-gray-700 appearance-none w-full pr-2"
              >
                <option value="All">All Statuses</option>
                <option value="Action Required">Action Required</option>
                <option value="Pending">Pending</option>
                <option value="In Transit">In Transit</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search by title or ID..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] bg-white shadow-sm transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Table Body - Mobile Friendly Horizontal Scroll */}
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1180px] table-fixed text-left text-sm border-collapse">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[19%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-4">Document Name</th>
                <th className="p-4">Reference ID (QR)</th>
                <th className="p-4">Process Type</th>
                <th className="p-4">Est. Completion</th>
                <th className="p-4">Current Location</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              
              {/* OPTIMIZATION: Skeleton Loaders for Initial Fetch */}
              {isDocsLoading && documents.length === 0 ? (
                [...Array(4)].map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="p-4 align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse shrink-0"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 w-32 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div></td>
                    <td className="p-4"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div></td>
                    <td className="p-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div></td>
                    <td className="p-4"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse"></div></td>
                    <td className="p-4 text-center"><div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredDocs.length > 0 ? (
                /* Actual Rendered Data */
                filteredDocs.map(d => (
                  <tr key={d.ini_id} 
                      onClick={() => setSelected(d)}
                      className={`transition-colors cursor-pointer group ${selected?.ini_id === d.ini_id ? 'bg-red-50/40' : 'hover:bg-gray-50/80'}`}>
                    <td className="p-4 align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`p-2 rounded-lg transition-all duration-150 shrink-0 ${selected?.ini_id === d.ini_id ? 'bg-white shadow-sm border border-red-100' : 'bg-gray-50 border border-gray-100 group-hover:bg-white group-hover:border-red-100 group-hover:shadow-sm'}`}>
                          <FileText size={16} className={`transition-colors duration-150 ${selected?.ini_id === d.ini_id ? 'text-[#D32F2F]' : 'text-gray-500 group-hover:text-[#D32F2F]'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-gray-900 text-sm leading-5" title={d.title}>{d.title}</p>
                          <p className="mt-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-gray-500">
                            {formatPhilippineDateTime(d.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <span title={d.qr_code} className="block max-w-full truncate rounded border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs font-bold text-gray-600">
                        {d.qr_code}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="flex items-start gap-1.5 text-xs font-medium leading-5 text-gray-700">
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                        <span className="line-clamp-2" title={d.process_name}>{d.process_name}</span>
                      </span>
                    </td>
                    <td className="p-4 align-middle text-xs text-gray-600 font-medium whitespace-nowrap">
                      {d.edc ? new Date(d.edc).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Processing'}
                    </td>
                    <td className="p-4 align-middle">
                      <span className={`inline-flex max-w-full items-center justify-center rounded-md px-2.5 py-1 text-center text-[10px] font-black uppercase leading-4 tracking-wider shadow-sm ${getStatusStyles(d.status)}`}>
                        {d.status?.toLowerCase() === 'completed' ? 'Completed' : 
                          d.status?.toLowerCase() === 'action required' ? 'Halted Checklist' : (d.current_office || 'Origin Unit')}
                      </span>
                    </td>
                    <td className="p-4 text-center align-middle">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelected(d); }}
                        className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm text-gray-500 hover:text-gray-900 mx-auto flex items-center justify-center transition-all focus:outline-none cursor-pointer"
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {d.status?.toLowerCase() === 'action required' && (
                        <div className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 p-3 text-left" onClick={e => e.stopPropagation()}>
                          <p className="text-[11px] text-red-800 font-medium mb-2 leading-relaxed">
                            <strong className="block text-[10px] uppercase tracking-wider mb-0.5">Remarks:</strong>
                            {d.last_action}
                          </p>
                          {d.release_time ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setRevision({ ...d }); }} 
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-red-700 hover:text-red-900 cursor-pointer mt-2 transform active:scale-95 transition-[transform,colors] duration-200"
                            >
                              <RefreshCw size={12} /> Correct & Resubmit
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1 mt-2">
                              <AlertCircle size={12} /> Awaiting Release Return
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                /* Empty State */
                <tr>
                  <td colSpan="6" className="p-12 text-center bg-gray-50/50">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Inbox className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm font-bold text-gray-600">No submissions found</p>
                      <p className="text-xs text-gray-500 mt-1 font-medium">Try adjusting your filters or search terms.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}
      {showModal && (
        <DocumentSubmissionModal 
          setShowModal={setShowModal} 
          submitDocument={submit} 
          form={form} 
          setForm={setForm} 
          handleProcessChange={id => setForm({ ...form, processTypeId: id, completeOriginProcessing: false })} 
          processTypes={processTypes} 
          workflowsLoading={loading} 
          workflowError={workflowError} 
          retryWorkflows={() => { setLoading(true); workflows(); }} 
          estimatedDate={form.customRoute ? (customEdc ? formatPhilippineDate(customEdc) : 'Complete the route to calculate') : (estimate ? formatPhilippineDate(estimate) : "Estimate unavailable")} 
          selectedRoutePreview={process?.resolved_route_names || []} 
          canCompleteOriginProcessing={eligible} 
          submitting={busy} 
          submissionError={error} 
        />
      )}
      
      {selected && (
        <OfficeDocumentModal 
          selectedDoc={selected} 
          processorOfficeId={officeId} 
          officesList={[]} 
          isHistoryDetails 
          onClose={() => setSelected(null)} 
          onRefresh={load} 
        />
      )}

      {/* Resubmit Revision Modal */}
      {revision && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-[100] p-4 flex items-center justify-center animate-in fade-in duration-150">
          <form onSubmit={resubmit} className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            
            <div className="p-4 bg-neutral-900 text-white font-bold text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} />
                <span>Document Revision</span>
              </div>
              <button type="button" onClick={() => setRevision(null)} className="hover:opacity-80 transition-opacity cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl">
                <p className="text-[10px] font-black uppercase text-red-800 tracking-wider mb-1">Required Action</p>
                <p className="text-xs text-red-700 font-medium">{revision.last_action}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 tracking-wide">Document Title</label>
                <input 
                  required 
                  maxLength={150} 
                  value={revision.title} 
                  onChange={e => setRevision({ ...revision, title: e.target.value })} 
                  className="w-full px-4 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#D32F2F] bg-gray-50 font-bold text-gray-900 transition-all duration-200"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-0.5 shrink-0">
                  <input type="checkbox" required className="peer sr-only" />
                  <div className="w-4 h-4 border-2 border-gray-300 rounded flex items-center justify-center peer-checked:bg-[#D32F2F] peer-checked:border-[#D32F2F] transition-colors duration-150">
                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-600 leading-snug group-hover:text-gray-900 transition-colors duration-150">
                  I confirm that I have corrected the physical document and its supporting materials according to the remarks above.
                </span>
              </label>

              {error && <p role="alert" className="text-xs font-bold text-red-600 flex items-center gap-1"><AlertCircle size={14} className="shrink-0"/> {error}</p>}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button disabled={busy} type="button" onClick={() => setRevision(null)} className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg shadow-sm cursor-pointer transform active:scale-95 transition-all duration-200">
                Cancel
              </button>
              <button disabled={busy} type="submit" className="px-6 py-2 bg-[#D32F2F] hover:bg-[#b71c1c] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md cursor-pointer disabled:opacity-50 transform active:scale-95 hover:-translate-y-0.5 transition-all duration-200">
                {busy ? 'Processing...' : 'Resubmit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
