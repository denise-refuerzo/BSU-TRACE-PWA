import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { Archive, Check, ChevronDown, OctagonX, RotateCcw, Search, Share2, Trash2, UserPlus, Users, X } from 'lucide-react';
import { fetchWithAuth } from '../../../api';
import { createRealtimeClient } from '../../../utils/realtimeClient';

const button = 'trace-button dark:bg-[#1c1113] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#2b1317]';
const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://bsu-trace-pwa.onrender.com';

function CandidateRows({ people, selectedCandidates, busy, candidateLoading, onToggle }) {
  if (!people.length) return candidateLoading ? null : <p className="rounded-xl border border-dashed border-neutral-300 dark:border-gray-700 p-4 text-center text-xs text-neutral-500 dark:text-gray-400">No eligible accounts found.</p>;
  return (
    <div className="divide-y divide-neutral-100 dark:divide-gray-800 overflow-hidden rounded-xl border border-neutral-200 dark:border-[#42292f]">
      {people.map(candidate => {
        const checked = Boolean(selectedCandidates[candidate.user_id]);
        return (
          <button 
            type="button" 
            key={candidate.user_id} 
            disabled={busy} 
            onClick={() => onToggle(candidate)} 
            className={`flex w-full items-center gap-3 p-3 text-left transition-colors cursor-pointer ${
              checked 
                ? 'bg-red-50 dark:bg-red-900/30' 
                : 'hover:bg-neutral-50 dark:hover:bg-[#2b1317]/50'
            }`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? 'border-red-800 bg-red-800 text-white' : 'border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113]'}`}>
              {checked && <Check size={13}/>}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm text-neutral-900 dark:text-white">{candidate.full_name}</strong>
              <span className="block truncate text-xs text-neutral-500 dark:text-gray-400">{candidate.uni_email}</span>
              {(candidate.office_name || candidate.department_name) && (
                <span className="mt-0.5 block truncate text-[10px] font-semibold text-neutral-400 dark:text-gray-500">
                  {[candidate.office_name, candidate.department_name].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function DocumentAccessControls({ document, onChanged, onCloseParent }) {
  const [open, setOpen] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [candidateContext, setCandidateContext] = useState({ isOfficeSubmission: false, scopes: [] });
  const [expandedScope, setExpandedScope] = useState(null);
  const [scopeCandidates, setScopeCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [reason, setReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [error, setError] = useState('');

  const isOwner = Boolean(document?.permissions?.isOwner);
  const latestStatus = Number(document?.steps?.at(-1)?.s_id);
  const cancelled = document?.lifecycle_state === 'cancelled';
  const canArchive = cancelled || [4, 5].includes(latestStatus);
  const selected = useMemo(() => Object.values(selectedCandidates), [selectedCandidates]);

  const request = useCallback(async (url, options) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetchWithAuth(url, options);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The action could not be completed.');
      return data;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const loadCollaborators = useCallback(async () => {
    const data = await request(`/api/collaboration/documents/${document.ini_id}/collaborators`);
    if (!data) return;
    const people = data.collaborators || [];
    setCollaborators(people);
    const existing = new Set(people.map(person => String(person.user_id)));
    setSelectedCandidates(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !existing.has(id))));
  }, [document.ini_id, request]);

  const loadCandidates = useCallback(async (scope, search = '') => {
    setCandidateLoading(true);
    try {
      const parameters = new URLSearchParams({ scope });
      if (search) parameters.set('search', search);
      const response = await fetchWithAuth(`/api/collaboration/documents/${document.ini_id}/candidates?${parameters}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load collaborator suggestions.');
      setCandidateContext({ isOfficeSubmission: Boolean(data.isOfficeSubmission), scopes: data.scopes || [] });
      if (scope === 'search') setSuggestions(data.candidates || []);
      else if (scope !== 'context') setScopeCandidates(data.candidates || []);
      return data;
    } catch (candidateError) {
      setError(candidateError.message);
      return null;
    } finally {
      setCandidateLoading(false);
    }
  }, [document.ini_id]);

  useEffect(() => {
    if (!open || !isOwner || query.trim().length < 2) return undefined;
    const timer = setTimeout(() => loadCandidates('search', query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query, open, isOwner, loadCandidates]);

  const refreshLive = useEffectEvent(payload => {
    if (payload?.iniId && String(payload.iniId) !== String(document.ini_id)) return;
    loadCollaborators();
    if (expandedScope) loadCandidates(expandedScope);
    else if (query.trim().length >= 2) loadCandidates('search', query.trim());
  });

  useEffect(() => {
    if (!open) return undefined;
    const userId = localStorage.getItem('userId');
    if (!userId) return undefined;
    const socket = createRealtimeClient(SOCKET_URL, { reconnection: true });
    const connect = () => socket.emit('join-user-room', userId);
    socket.on('connect', connect);
    socket.on('collaboration-updated', refreshLive);
    return () => socket.disconnect();
  }, [open]);

  const openPanel = () => {
    setOpen(true);
    loadCollaborators();
    if (isOwner) loadCandidates('context');
  };

  const toggleCandidate = candidate => {
    setSelectedCandidates(previous => {
      const next = { ...previous };
      if (next[candidate.user_id]) delete next[candidate.user_id];
      else next[candidate.user_id] = candidate;
      return next;
    });
  };

  const toggleScope = async scope => {
    if (expandedScope === scope) {
      setExpandedScope(null);
      setScopeCandidates([]);
      return;
    }
    setExpandedScope(scope);
    setScopeCandidates([]);
    await loadCandidates(scope);
  };

  const addSelected = async () => {
    if (!selected.length) return;
    const names = selected.map(person => person.full_name);
    const preview = names.length <= 4 ? names.join(', ') : `${names.slice(0, 4).join(', ')} and ${names.length - 4} more`;
    const confirmation = await Swal.fire({
      icon: 'question', title: `Add ${selected.length} collaborator${selected.length === 1 ? '' : 's'}?`,
      text: `${preview} will be able to view, track, and chat about this submission.`, showCancelButton: true,
      confirmButtonText: `Add collaborator${selected.length === 1 ? '' : 's'}`, cancelButtonText: 'Cancel',
      confirmButtonColor: '#991b1b', reverseButtons: true
    });
    if (!confirmation.isConfirmed) return;
    const data = await request(`/api/collaboration/documents/${document.ini_id}/collaborators`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: selected.map(person => person.user_id) })
    });
    if (!data) return;
    setSelectedCandidates({}); setQuery(''); setSuggestions([]);
    if (expandedScope) await loadCandidates(expandedScope);
    await loadCollaborators();
    onChanged?.();
    await Swal.fire({ icon: 'success', title: 'Access granted', text: data.message, confirmButtonColor: '#991b1b' });
  };

  const remove = async person => {
    const data = await request(`/api/collaboration/documents/${document.ini_id}/collaborators/${person.user_id}`, { method: 'DELETE' });
    if (data) { await loadCollaborators(); onChanged?.(); }
  };
  const cancel = async () => {
    const data = await request(`/api/collaboration/documents/${document.ini_id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    if (data) { onChanged?.(); onCloseParent?.(); }
  };
  const archive = async () => {
    const data = await request(`/api/collaboration/documents/${document.ini_id}/archive`, { method: 'POST' });
    if (data) { onChanged?.(); onCloseParent?.(); }
  };

  return (
    <>
      <button className={button} onClick={openPanel}><Share2 size={15}/>{isOwner ? 'Access & actions' : 'Shared access'}</button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/60 p-4" onMouseDown={event => event.target === event.currentTarget && setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="access-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-200 dark:border-[#42292f] bg-white dark:bg-[#180e10] shadow-2xl">
            <header className="flex items-center justify-between bg-[#701126] dark:bg-red-950 px-5 py-4 text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Viewer-only collaboration</p>
                <h2 id="access-title" className="mt-1 font-black">Access and document actions</h2>
              </div>
              <button aria-label="Close" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/15 cursor-pointer"><X size={19}/></button>
            </header>
            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 text-left">
              {error && <p role="alert" className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-3 text-xs font-semibold text-red-800 dark:text-red-300">{error}</p>}
              <section>
                <h3 className="text-sm font-black text-neutral-900 dark:text-white">People with access</h3>
                <p className="mt-1 text-xs text-neutral-500 dark:text-gray-400">Collaborators can view, track, and chat. They cannot edit or stop the submission.</p>
                <div className="mt-3 space-y-2">
                  {collaborators.map(person => (
                    <div key={person.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-[#42292f] p-3 bg-white dark:bg-[#1c1113]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-neutral-800 dark:text-white">{person.full_name}</p>
                        <p className="truncate text-xs text-neutral-500 dark:text-gray-400">{person.uni_email} · Viewer</p>
                      </div>
                      {isOwner && (
                        <button disabled={busy} onClick={() => remove(person)} aria-label={`Remove ${person.full_name}`} className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400 cursor-pointer">
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  ))}
                  {!collaborators.length && <p className="rounded-xl border border-dashed border-neutral-300 dark:border-gray-700 p-4 text-center text-xs text-neutral-500 dark:text-gray-400">No collaborators have been added.</p>}
                </div>
              </section>

              {isOwner && (
                <section className="border-t border-neutral-100 dark:border-[#42292f] pt-5">
                  <label className="text-xs font-bold text-neutral-700 dark:text-gray-300">Add a university account</label>
                  <p className="mt-1 text-[11px] text-neutral-500 dark:text-gray-400">Search suggestions are available by name or university email.</p>
                  <div className="relative mt-2">
                    <Search size={15} className="absolute left-3 top-3 text-neutral-400"/>
                    <input value={query} onChange={event => { setQuery(event.target.value); if (event.target.value.trim().length < 2) setSuggestions([]); }} placeholder="Search name or university email" className="w-full rounded-xl border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-red-800"/>
                  </div>
                  {query.trim().length >= 2 && <div className="mt-2"><CandidateRows people={suggestions} selectedCandidates={selectedCandidates} busy={busy} candidateLoading={candidateLoading} onToggle={toggleCandidate}/></div>}
                  {candidateContext.isOfficeSubmission && candidateContext.scopes.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-neutral-600 dark:text-gray-300"><Users size={14}/>Quick select from the submitter’s organization</p>
                      <div className="space-y-2">
                        {candidateContext.scopes.map(scope => (
                          <div key={scope.id} className="overflow-hidden rounded-xl border border-neutral-200 dark:border-[#42292f]">
                            <button type="button" onClick={() => toggleScope(scope.id)} className={`flex w-full items-center justify-between gap-3 p-3 text-left text-xs font-bold cursor-pointer ${expandedScope === scope.id ? 'bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-300' : 'bg-white dark:bg-[#1c1113] text-neutral-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-[#2b1317]/50'}`}>
                              <span>{scope.id === 'office' ? 'Office' : 'Department'} · {scope.label}</span>
                              <ChevronDown size={15} className={`transition-transform ${expandedScope === scope.id ? 'rotate-180' : ''}`}/>
                            </button>
                            {expandedScope === scope.id && <div className="border-t border-neutral-200 dark:border-[#42292f] p-2 bg-white dark:bg-[#180e10]"><CandidateRows people={scopeCandidates} selectedCandidates={selectedCandidates} busy={busy} candidateLoading={candidateLoading} onToggle={toggleCandidate}/></div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.length > 0 && (
                    <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-3">
                      <p className="text-xs font-black text-red-900 dark:text-red-300">{selected.length} account{selected.length === 1 ? '' : 's'} selected</p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-red-700 dark:text-red-400">{selected.map(person => person.full_name).join(', ')}</p>
                      <button type="button" disabled={busy} onClick={addSelected} className="trace-button trace-button-primary mt-3 cursor-pointer"><UserPlus size={15}/>Add selected collaborator{selected.length === 1 ? '' : 's'}</button>
                    </div>
                  )}
                </section>
              )}

              <section className="border-t border-neutral-100 dark:border-[#42292f] pt-5">
                <h3 className="text-sm font-black text-neutral-900 dark:text-white">Personal organization</h3>
                {canArchive ? (
                  <button disabled={busy} onClick={archive} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-neutral-200 dark:border-[#42292f] bg-white dark:bg-[#1c1113] p-3 text-left hover:bg-neutral-50 dark:hover:bg-[#2b1317]/50 cursor-pointer">
                    <Archive size={18} className="text-red-800 dark:text-red-400"/>
                    <span>
                      <strong className="block text-sm text-neutral-900 dark:text-white">Archive for me</strong>
                      <span className="text-xs text-neutral-500 dark:text-gray-400">Hides this item from your regular submission lists only.</span>
                    </span>
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-neutral-500 dark:text-gray-400">Archiving becomes available when processing is completed, returned for action, or stopped.</p>
                )}
              </section>

              {isOwner && !cancelled && latestStatus !== 5 && (
                <section className="border-t border-red-100 dark:border-red-900/50 pt-5">
                  {!showCancel ? (
                    <button onClick={() => setShowCancel(true)} className="flex w-full items-center gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-3 text-left text-red-900 dark:text-red-300 cursor-pointer">
                      <OctagonX size={18}/>
                      <span>
                        <strong className="block text-sm">Stop processing</strong>
                        <span className="text-xs text-red-700 dark:text-red-400">Removes the submission from every office queue but preserves its history.</span>
                      </span>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-4">
                      <label className="text-xs font-black text-red-900 dark:text-red-300">Reason for stopping processing
                        <textarea maxLength={500} rows={3} value={reason} onChange={event => setReason(event.target.value)} className="mt-2 block w-full resize-none rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-[#1c1113] p-3 text-sm text-neutral-800 dark:text-white outline-none"/>
                      </label>
                      <div className="mt-3 flex gap-2">
                        <button disabled={busy || reason.trim().length < 5} onClick={cancel} className="trace-button trace-button-primary cursor-pointer"><OctagonX size={15}/>Confirm stop</button>
                        <button disabled={busy} onClick={() => { setShowCancel(false); setReason(''); }} className="trace-button dark:bg-[#1c1113] dark:border-gray-700 dark:text-gray-300 cursor-pointer"><RotateCcw size={15}/>Keep processing</button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}