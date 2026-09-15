import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchWithAuth } from '../../../../api';
import DocumentSubmissionModal from '../../originator/modals/DocumentSubmissionModal';
import OfficeDocumentModal from '../modals/OfficeDocumentModal';
import { formatPhilippineDateTime, formatPhilippineDate } from '../../../../utils/philippineTime';
import { Search, Plus, AlertCircle, X, FileText, RefreshCw, Eye, Inbox, Building, Filter } from 'lucide-react';

export default function OfficeSubmissionsTab({ officeId, onProcessed = () => {} }) {
  const userId = localStorage.getItem('userId');
  
  // --- STATE ---
  const [estimateBase, setEstimateBase] = useState(() => Date.now());
  const [documents, setDocuments] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDocsLoading, setIsDocsLoading] = useState(true); // Tracks initial document load
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
  // Prevents the UI from stuttering by waiting 300ms after the user stops typing
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

  useEffect(() => { load(); workflows(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, [officeId, load, workflows]);

  useEffect(() => { let cancelled = false; fetchWithAuth('/api/analytics/edc').then(async res => { if (res.ok) { const data = await res.json(); if (!cancelled && Array.isArray(data)) setPredictions(data); } }).catch(() => {}); return () => { cancelled = true; }; }, []);

  useEffect(() => { let cancelled = false; const ids = form.customRoute?.stops?.filter(Boolean); if (!ids?.length) { setCustomHours(null); return; } fetchWithAuth(`/api/analytics/edc?route=${ids.join(',')}`).then(async r => r.ok ? r.json() : []).then(d => { if (!cancelled) setCustomHours(d[0]?.estimated_hours_to_complete ?? null); }).catch(() => setCustomHours(null)); return () => { cancelled = true; }; }, [form.customRoute?.stops?.join(',')]);

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
    if (s.includes('completed') || s.includes('finalized')) return 'bg-green-50 text-green-700 border-green-200';
    if (s.includes('verification') || s.includes('transit') || s.includes('routing')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (s.includes('action required') || s.includes('halted')) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const getStatusDot = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('completed') || s.includes('finalized')) return 'bg-green-500';
    if (s.includes('verification') || s.includes('transit') || s.includes('routing')) return 'bg-purple-500';
    if (s.includes('action required') || s.includes('halted')) return 'bg-red-500';
    return 'bg-amber-500';
  };

  // --- OPTIMIZATION: Data Memoization ---
  // React will only recalculate this list if documents, search, or filters change
  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const matchesSearch = (d.title + ' ' + d.qr_code).toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesFilter = filterStatus === 'All' || d.status?.toLowerCase() === filterStatus.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [documents, debouncedSearch, filterStatus]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-left animate-in fade-in duration-200">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight">Office Submissions</h2>
          <p className="text-xs text-neutral-500 font-medium mt-1">Manage and track documents submitted by your office.</p>
        </div>
        <button 
          onClick={() => { setEstimateBase(Date.now()); setLoading(true); setShowModal(true); workflows(); }} 
          className="flex items-center justify-center gap-2 bg-red-800 hover:bg-red-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transform active:scale-95 hover:-translate-y-0.5 transition-[transform,colors] duration-200"
        >
          <Plus size={16} /> Submit Document
        </button>
      </div>

      {error && !showModal && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* MATRIX TABLE CONTAINER */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Controls Header */}
        <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-neutral-900 tracking-tight uppercase">Submitted Documents Matrix</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
              <input 
                type="text" 
                placeholder="Search by title or ID..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:ring-1 focus:ring-red-800 bg-white font-bold text-neutral-800 placeholder:text-neutral-400 shadow-sm transition-shadow transition-colors duration-200" 
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2 border border-neutral-300 rounded-xl px-3 py-2 bg-white shadow-sm focus-within:ring-1 focus-within:ring-red-800 transition-shadow transition-colors duration-200 cursor-pointer">
              <Filter size={14} className="text-neutral-500" />
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)} 
                className="bg-transparent text-xs outline-none cursor-pointer font-bold text-neutral-700 appearance-none pr-4"
              >
                <option value="All">All Statuses</option>
                <option value="Action Required">Action Required</option>
                <option value="Pending">Pending</option>
                <option value="In Transit">In Transit</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">Document Title</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">Submitted By</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">Current Office</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              
              {/* OPTIMIZATION: Skeleton Loaders for Initial Fetch */}
              {isDocsLoading && documents.length === 0 ? (
                [...Array(4)].map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-200 animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-48 bg-neutral-200 rounded animate-pulse"></div>
                          <div className="h-3 w-32 bg-neutral-100 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-neutral-200 rounded animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="h-4 w-32 bg-neutral-200 rounded animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="h-6 w-20 bg-neutral-200 rounded-md animate-pulse"></div></td>
                    <td className="px-5 py-4 text-right"><div className="h-8 w-24 bg-neutral-200 rounded-lg animate-pulse ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredDocs.length > 0 ? (
                /* Actual Rendered Data */
                filteredDocs.map(d => (
                  <tr key={d.ini_id} className="hover:bg-neutral-50/80 transition-colors duration-150 group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 group-hover:bg-white group-hover:border-red-200 transition-colors duration-150">
                          <FileText size={16} className="text-neutral-500 group-hover:text-red-800 transition-colors duration-150" />
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 text-sm leading-tight">{d.title}</p>
                          <p className="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-wide">
                            {formatPhilippineDateTime(d.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-neutral-700">{d.submitted_by}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
                        <Building size={14} className="text-neutral-400" />
                        {d.current_office}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm border ${getStatusStyles(d.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${getStatusDot(d.status)}`}></span>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button 
                        onClick={() => setSelected(d)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 text-neutral-700 font-bold rounded-lg hover:bg-red-50 hover:text-red-800 hover:border-red-200 shadow-sm cursor-pointer focus:outline-none transform active:scale-95 hover:-translate-y-0.5 transition-[transform,colors] duration-200 text-[11px]"
                      >
                        <Eye size={14} /> View Details
                      </button>
                      
                      {d.status?.toLowerCase() === 'action required' && (
                        <div className="mt-3 text-left bg-red-50 border border-red-100 p-3 rounded-xl min-w-[200px]">
                          <p className="text-[11px] text-red-800 font-medium mb-2 leading-relaxed">
                            <strong className="block text-[10px] uppercase tracking-wider mb-0.5">Remarks:</strong>
                            {d.last_action}
                          </p>
                          {d.release_time ? (
                            <button 
                              onClick={() => setRevision({ ...d })}
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
                  <td colSpan="5" className="px-5 py-12 text-center bg-neutral-50/50">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                        <Inbox className="w-8 h-8 text-neutral-300" />
                      </div>
                      <p className="text-sm font-bold text-neutral-600">No submissions found</p>
                      <p className="text-xs text-neutral-500 mt-1 font-medium">Try adjusting your filters or search terms.</p>
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
          <form onSubmit={resubmit} className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            
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
                <label className="block text-[10px] font-black text-neutral-400 uppercase mb-1 tracking-wide">Document Title</label>
                <input 
                  required 
                  maxLength={150} 
                  value={revision.title} 
                  onChange={e => setRevision({ ...revision, title: e.target.value })} 
                  className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-xl outline-none focus:ring-1 focus:ring-red-800 bg-neutral-50 font-bold text-neutral-800 transition-shadow transition-colors duration-200"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-0.5">
                  <input type="checkbox" required className="peer sr-only" />
                  <div className="w-4 h-4 border-2 border-neutral-300 rounded flex items-center justify-center peer-checked:bg-red-800 peer-checked:border-red-800 transition-colors duration-150">
                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
                <span className="text-xs font-medium text-neutral-600 leading-snug group-hover:text-neutral-900 transition-colors duration-150">
                  I confirm that I have corrected the physical document and its supporting materials according to the remarks above.
                </span>
              </label>

              {error && <p role="alert" className="text-xs font-bold text-red-600 flex items-center gap-1"><AlertCircle size={14}/> {error}</p>}
            </div>

            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-2">
              <button disabled={busy} type="button" onClick={() => setRevision(null)} className="px-5 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl shadow-sm cursor-pointer transform active:scale-95 transition-[transform,colors] duration-200">
                Cancel
              </button>
              <button disabled={busy} type="submit" className="px-6 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md cursor-pointer disabled:opacity-50 transform active:scale-95 hover:-translate-y-0.5 transition-[transform,colors] duration-200">
                {busy ? 'Processing...' : 'Resubmit'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}