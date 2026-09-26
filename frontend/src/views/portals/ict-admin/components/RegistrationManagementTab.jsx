import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clipboard, Link2, RefreshCw, ShieldX, Users } from 'lucide-react';
import Swal from 'sweetalert2';
import { API_BASE_URL, fetchWithAuth } from '../../../../api';
import { createRealtimeClient } from '../../../../utils/realtimeClient';

const localDateTime = value => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const statusClass = status => ({
  pending: 'bg-amber-100 text-amber-800', active: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800', revoked: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-700', exhausted: 'bg-blue-100 text-blue-800'
}[status] || 'bg-gray-100 text-gray-700');

const PAGE_SIZE = 6;

export default function RegistrationManagementTab() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [drafts, setDrafts] = useState({});
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/admin/registration-links');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load registration requests.');
      setLinks(data);
      setDrafts(current => {
        const next = { ...current };
        data.forEach(link => {
          if (!next[link.link_id]) next[link.link_id] = {
            maxRegistrations: Number(link.requested_max_registrations) || 1,
            expiresAt: localDateTime(link.requested_expires_at), decisionNote: ''
          };
        });
        return next;
      });
    } catch (error) {
      Swal.fire('Unable to load registration management', error.message, 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const socket = createRealtimeClient(API_BASE_URL, { secure: true, reconnection: true });
    socket.on('connect', () => socket.emit('join-ict-admin-room'));
    socket.on('registration-link-updated', load);
    return () => socket.disconnect();
  }, [load]);

  const filtered = useMemo(() => links.filter(link => !statusFilter || link.status === statusFilter), [links, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const displayedLinks = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const patchStatus = async (link, action) => {
    const draft = drafts[link.link_id] || {};
    const endpoint = action === 'approve'
      ? `/api/admin/registration-links/${link.link_id}/approve`
      : `/api/admin/registration-links/${link.link_id}/status`;
    const body = action === 'approve'
      ? { maxRegistrations: Number(draft.maxRegistrations), expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : '', decisionNote: draft.decisionNote }
      : { status: action, decisionNote: draft.decisionNote };
    try {
      const response = await fetchWithAuth(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update the request.');
      await load();
      Swal.fire('Updated', data.message, 'success');
    } catch (error) { Swal.fire('Request not updated', error.message, 'error'); }
  };

  const copyLink = async link => {
    const url = `${window.location.origin}${link.registration_path}`;
    await navigator.clipboard.writeText(url);
    Swal.fire({ icon: 'success', title: 'Link copied', text: 'The registration link is ready to share.', timer: 1400, showConfirmButton: false });
  };

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <p className="text-sm text-gray-500">Approve secure registration batches and monitor every account created from them.</p>
      <div className="flex gap-2">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">All statuses</option>{['pending','active','exhausted','expired','revoked','rejected'].map(status => <option key={status} value={status}>{status[0].toUpperCase()+status.slice(1)}</option>)}</select>
        <button type="button" onClick={load} className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50" aria-label="Refresh"><RefreshCw size={18}/></button>
      </div>
    </div>
    {loading ? <p className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">Loading registration requests...</p> : filtered.length === 0 ? <p className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">No registration requests match this filter.</p> : <div className="space-y-4">
      {displayedLinks.map(link => {
        const draft = drafts[link.link_id] || {};
        return <article key={link.link_id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(link.status)}`}>{link.status}</span><span className="text-xs font-bold text-gray-500">{link.account_type_name}</span></div>
              <h3 className="mt-2 text-lg font-black text-gray-900">{link.office_name || link.department_name}</h3>
              <p className="mt-1 text-sm text-gray-600">Requested by <strong>{link.requested_by}</strong> · {new Date(link.created_at).toLocaleString()}</p>
              {link.request_note && <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{link.request_note}</p>}
            </div>
            <div className="min-w-56 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
              <p><strong>Usage:</strong> {link.registration_count} / {link.max_registrations || link.requested_max_registrations}</p>
              <p className="mt-1"><strong>Expires:</strong> {new Date(link.expires_at || link.requested_expires_at).toLocaleString()}</p>
              {link.approved_by && <p className="mt-1"><strong>Approved by:</strong> {link.approved_by}</p>}
            </div>
          </div>
          {link.status === 'pending' && <div className="mt-4 grid gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 md:grid-cols-3">
            <label className="text-xs font-bold text-gray-700">Registration limit<input type="number" min="1" max="100" value={draft.maxRegistrations || ''} onChange={e => setDrafts({...drafts,[link.link_id]:{...draft,maxRegistrations:e.target.value}})} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"/></label>
            <label className="text-xs font-bold text-gray-700">Expiration<input type="datetime-local" value={draft.expiresAt || ''} onChange={e => setDrafts({...drafts,[link.link_id]:{...draft,expiresAt:e.target.value}})} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"/></label>
            <label className="text-xs font-bold text-gray-700">Decision note<input maxLength={500} value={draft.decisionNote || ''} onChange={e => setDrafts({...drafts,[link.link_id]:{...draft,decisionNote:e.target.value}})} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Optional"/></label>
            <div className="flex gap-2 md:col-span-3"><button type="button" onClick={() => patchStatus(link,'approve')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white"><Check size={15}/> Approve &amp; generate</button><button type="button" onClick={() => patchStatus(link,'rejected')} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700"><ShieldX size={15}/> Reject</button></div>
          </div>}
          {link.status === 'active' && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => copyLink(link)} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white"><Clipboard size={15}/> Copy registration link</button><button type="button" onClick={() => patchStatus(link,'revoked')} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-700"><ShieldX size={15}/> Revoke</button></div>}
          {link.registered_accounts?.length > 0 && <details className="mt-4 rounded-xl border border-gray-200"><summary className="flex cursor-pointer items-center gap-2 p-3 text-sm font-bold text-gray-800"><Users size={16}/> {link.registered_accounts.length} registered account{link.registered_accounts.length === 1 ? '' : 's'}</summary><div className="divide-y border-t">{link.registered_accounts.map(account => <div key={account.userId} className="flex flex-col justify-between gap-1 p-3 text-xs sm:flex-row"><span><strong>{account.fullName}</strong> · {account.email}</span><span className="text-gray-500">{new Date(account.registeredAt).toLocaleString()}</span></div>)}</div></details>}
          {link.registration_path && <p className="mt-3 flex items-center gap-2 break-all text-[10px] text-gray-400"><Link2 size={12}/>{link.registration_path}</p>}
        </article>;
      })}
      {filtered.length > PAGE_SIZE && <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
        <span>Page <strong className="text-gray-900">{currentPage}</strong> of <strong className="text-gray-900">{pageCount}</strong> · {filtered.length} requests</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={17}/></button>
          <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page"><ChevronRight size={17}/></button>
        </div>
      </div>}
    </div>}
  </div>;
}
