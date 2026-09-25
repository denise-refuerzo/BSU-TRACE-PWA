import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clipboard, Link2, Plus, Search, Send, Users, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { API_BASE_URL, fetchWithAuth } from '../../../../api';
import { createRealtimeClient } from '../../../../utils/realtimeClient';

const LINKS_PER_COLUMN = 4;
const ACCOUNTS_PER_PAGE = 8;

const KANBAN_COLUMNS = [
  { id: 'pending', title: 'Pending review', description: 'Waiting for ICT', statuses: ['pending'], accent: 'bg-amber-500' },
  { id: 'active', title: 'Ready to share', description: 'Approved and usable', statuses: ['active'], accent: 'bg-emerald-600' },
  { id: 'closed', title: 'Closed', description: 'Completed or unavailable', statuses: ['exhausted', 'expired', 'revoked', 'rejected'], accent: 'bg-neutral-500' }
];

const defaultExpiry = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const statusClass = status => ({
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  revoked: 'bg-red-100 text-red-800',
  expired: 'bg-gray-200 text-gray-700',
  exhausted: 'bg-blue-100 text-blue-800'
}[status] || 'bg-gray-100 text-gray-700');

function Pagination({ page, pageCount, onPageChange, label }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-500">
      <span>{label ? `${label} · ` : ''}{page} of {pageCount}</span>
      <div className="flex gap-1">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 1} className="rounded-md border border-neutral-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={15} /></button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page === pageCount} className="rounded-md border border-neutral-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page"><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

function LinkCard({ link, onCopy }) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${statusClass(link.status)}`}>{link.status}</span>
        <span className="text-[10px] font-semibold text-neutral-400">{link.registration_count} / {link.max_registrations || link.requested_max_registrations} used</span>
      </div>
      <h4 className="mt-2 text-sm font-black text-neutral-900">{link.account_type_name}</h4>
      <p className="mt-0.5 truncate text-xs text-neutral-600" title={link.office_name || link.department_name}>{link.office_name || link.department_name}</p>
      <dl className="mt-3 space-y-1 border-t border-neutral-100 pt-2 text-[10px] text-neutral-500">
        <div className="flex justify-between gap-2"><dt>Requested</dt><dd className="text-right">{new Date(link.created_at).toLocaleDateString()}</dd></div>
        <div className="flex justify-between gap-2"><dt>Expires</dt><dd className="text-right">{new Date(link.expires_at || link.requested_expires_at).toLocaleString()}</dd></div>
      </dl>
      {link.decision_note && <p className="mt-2 line-clamp-2 rounded-lg bg-neutral-50 px-2 py-1.5 text-[10px] text-neutral-600" title={link.decision_note}>ICT: {link.decision_note}</p>}
      {link.status === 'active' && (
        <button type="button" onClick={() => onCopy(link)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-neutral-800">
          <Clipboard size={14} /> Copy link
        </button>
      )}
    </article>
  );
}

export default function RegistrationManagementPage({ userId, access }) {
  const [links, setLinks] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [linkPages, setLinkPages] = useState({ pending: 1, active: 1, closed: 1 });
  const [accountQuery, setAccountQuery] = useState('');
  const [accountSort, setAccountSort] = useState('newest');
  const [accountPage, setAccountPage] = useState(1);
  const [form, setForm] = useState({ accountType: 2, targetId: '', maxRegistrations: 5, expiresAt: defaultExpiry(), requestNote: '' });

  const availableScopes = form.accountType === 1 ? access?.departments || [] : access?.offices || [];
  const scopes = availableScopes.filter(scope => scope.can_request_registration);
  const targetFor = scope => form.accountType === 1 ? scope.department_id : scope.office_id;
  const effectiveTargetId = scopes.some(scope => String(form.targetId) === String(targetFor(scope)))
    ? form.targetId
    : scopes[0] ? String(targetFor(scopes[0])) : '';

  const load = useCallback(async () => {
    const response = await fetchWithAuth('/api/registration-links/my');
    const data = await response.json();
    if (response.ok) setLinks(data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!userId) return undefined;
    const socket = createRealtimeClient(API_BASE_URL, { secure: true, reconnection: true });
    socket.on('connect', () => socket.emit('join-user-room', userId));
    socket.on('registration-link-updated', load);
    return () => socket.disconnect();
  }, [load, userId]);

  const linksByColumn = useMemo(() => KANBAN_COLUMNS.map(column => ({
    ...column,
    links: links.filter(link => column.statuses.includes(link.status))
  })), [links]);

  const registeredAccounts = useMemo(() => links.flatMap(link => (link.registered_accounts || []).map(account => ({ ...account, link }))), [links]);
  const filteredAccounts = useMemo(() => {
    const query = accountQuery.trim().toLowerCase();
    return registeredAccounts
      .filter(account => !query || String(account.fullName || '').toLowerCase().includes(query))
      .sort((first, second) => {
        const difference = new Date(second.registeredAt).getTime() - new Date(first.registeredAt).getTime();
        return accountSort === 'newest' ? difference : -difference;
      });
  }, [accountQuery, accountSort, registeredAccounts]);
  const accountPageCount = Math.max(1, Math.ceil(filteredAccounts.length / ACCOUNTS_PER_PAGE));
  const currentAccountPage = Math.min(accountPage, accountPageCount);
  const displayedAccounts = filteredAccounts.slice((currentAccountPage - 1) * ACCOUNTS_PER_PAGE, currentAccountPage * ACCOUNTS_PER_PAGE);

  const submit = async event => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetchWithAuth('/api/registration-links/requests', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          accountType: Number(form.accountType),
          targetId: Number(effectiveTargetId),
          maxRegistrations: Number(form.maxRegistrations),
          expiresAt: new Date(form.expiresAt).toISOString()
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to submit the request.');
      setForm(current => ({ ...current, maxRegistrations: 5, expiresAt: defaultExpiry(), requestNote: '' }));
      setLinkPages(current => ({ ...current, pending: 1 }));
      setRequestOpen(false);
      await load();
      Swal.fire('Request sent', 'ICT will review the limit and expiration before generating the link.', 'success');
    } catch (error) {
      Swal.fire('Request not sent', error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async link => {
    await navigator.clipboard.writeText(`${window.location.origin}${link.registration_path}`);
    Swal.fire({ icon: 'success', title: 'Link copied', timer: 1200, showConfirmButton: false });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-neutral-900">Registration Management</h2>
          <p className="mt-1 text-sm text-neutral-500">Request controlled registration batches and monitor the accounts created under you.</p>
        </div>
        <button type="button" onClick={() => setRequestOpen(true)} className="inline-flex w-fit items-center gap-2 rounded-lg bg-red-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-900">
          <Plus size={17} /> Request a link
        </button>
      </div>

      <section aria-labelledby="my-links-heading">
        <div className="mb-3 flex items-center justify-between">
          <h3 id="my-links-heading" className="flex items-center gap-2 font-black text-neutral-900"><Link2 size={18} /> My registration links</h3>
          <span className="text-xs text-neutral-500">{links.length} total</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {linksByColumn.map(column => {
            const pageCount = Math.max(1, Math.ceil(column.links.length / LINKS_PER_COLUMN));
            const page = Math.min(linkPages[column.id] || 1, pageCount);
            const displayedLinks = column.links.slice((page - 1) * LINKS_PER_COLUMN, page * LINKS_PER_COLUMN);
            return (
              <div key={column.id} className="rounded-2xl border border-neutral-200 bg-neutral-100/70 p-3">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${column.accent}`} />
                    <div className="min-w-0"><h4 className="text-sm font-black text-neutral-900">{column.title}</h4><p className="text-[10px] text-neutral-500">{column.description}</p></div>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-neutral-600">{column.links.length}</span>
                </div>
                <div className="space-y-2">
                  {displayedLinks.map(link => <LinkCard key={link.link_id} link={link} onCopy={copyLink} />)}
                  {column.links.length === 0 && <p className="rounded-xl border border-dashed border-neutral-300 bg-white/60 px-3 py-8 text-center text-xs text-neutral-400">No links in this stage.</p>}
                </div>
                <div className="mt-3">
                  <Pagination page={page} pageCount={pageCount} onPageChange={nextPage => setLinkPages(current => ({ ...current, [column.id]: nextPage }))} label={`${column.links.length} links`} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm" aria-labelledby="registered-accounts-heading">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 id="registered-accounts-heading" className="flex items-center gap-2 font-black text-neutral-900"><Users size={18} /> Accounts registered under me</h3>
            <p className="mt-1 text-xs text-neutral-500">Accounts created through registration links that you requested.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <span className="sr-only">Search registered accounts by name</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input value={accountQuery} onChange={event => { setAccountQuery(event.target.value); setAccountPage(1); }} placeholder="Search by name" className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 sm:w-56" />
            </label>
            <select aria-label="Sort registered accounts" value={accountSort} onChange={event => { setAccountSort(event.target.value); setAccountPage(1); }} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-neutral-50 text-[10px] uppercase tracking-wide text-neutral-500"><tr><th className="p-3">Account</th><th className="p-3">Type / Area</th><th className="p-3">Registered</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {displayedAccounts.map(account => <tr key={account.userId} className="hover:bg-neutral-50/70"><td className="p-3"><strong>{account.fullName}</strong><span className="block text-xs text-neutral-500">{account.email}</span></td><td className="p-3 text-xs">{account.link.account_type_name}<span className="block text-neutral-500">{account.link.office_name || account.link.department_name}</span></td><td className="p-3 text-xs text-neutral-500">{new Date(account.registeredAt).toLocaleString()}</td></tr>)}
              {displayedAccounts.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-neutral-500">{accountQuery ? 'No registered accounts match that name.' : 'No accounts have registered through your links yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Pagination page={currentAccountPage} pageCount={accountPageCount} onPageChange={setAccountPage} label={`${filteredAccounts.length} accounts`} />
        </div>
      </section>

      {requestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !submitting) setRequestOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="request-link-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
              <div><h3 id="request-link-title" className="font-black text-neutral-900">Request a registration link</h3><p className="mt-1 text-xs text-neutral-500">ICT will review the requested limit and expiration.</p></div>
              <button type="button" onClick={() => setRequestOpen(false)} disabled={submitting} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50" aria-label="Close request form"><X size={19} /></button>
            </div>
            <form onSubmit={submit} className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-bold text-neutral-700">Account type
                  <select value={form.accountType} onChange={event => setForm({ ...form, accountType: Number(event.target.value), targetId: '' })} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="2">Regular Office Staff</option><option value="1">Faculty Staff</option></select>
                </label>
                <label className="text-xs font-bold text-neutral-700">Assigned {form.accountType === 1 ? 'department' : 'office'}
                  <select required value={effectiveTargetId} onChange={event => setForm({ ...form, targetId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Choose...</option>{scopes.map(scope => <option key={targetFor(scope)} value={targetFor(scope)}>{scope.department_name || scope.office_name}</option>)}</select>
                  {scopes.length === 0 && <span className="mt-1 block font-normal text-amber-700">ICT has not assigned registration authority for this scope type.</span>}
                </label>
                <label className="text-xs font-bold text-neutral-700">Requested account limit
                  <input required type="number" min="1" max="100" value={form.maxRegistrations} onChange={event => setForm({ ...form, maxRegistrations: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-normal" />
                </label>
                <label className="text-xs font-bold text-neutral-700">Requested expiration
                  <input required type="datetime-local" value={form.expiresAt} onChange={event => setForm({ ...form, expiresAt: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-normal" />
                </label>
                <label className="text-xs font-bold text-neutral-700 md:col-span-2">Reason or note <span className="font-normal text-neutral-400">(optional)</span>
                  <textarea maxLength={500} value={form.requestNote} onChange={event => setForm({ ...form, requestNote: event.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-normal" />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setRequestOpen(false)} disabled={submitting} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">Cancel</button>
                <button disabled={submitting || !effectiveTargetId} className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-50"><Send size={16} />{submitting ? 'Sending...' : 'Send to ICT'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
