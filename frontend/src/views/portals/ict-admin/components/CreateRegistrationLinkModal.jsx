import { useState } from 'react';
import { Clipboard, Link2, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { fetchWithAuth } from '../../../../api';

const defaultExpiry = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export default function CreateRegistrationLinkModal({ offices, departments, onClose, onViewLinks }) {
  const [form, setForm] = useState({ accountType: 2, targetId: '', maxRegistrations: 5, expiresAt: defaultExpiry(), requestNote: '' });
  const [submitting, setSubmitting] = useState(false);
  const [registrationPath, setRegistrationPath] = useState('');
  const areas = form.accountType === 1 ? departments : offices;

  const submit = async event => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetchWithAuth('/api/admin/registration-links', {
        method: 'POST',
        body: JSON.stringify({ ...form, accountType: Number(form.accountType), targetId: Number(form.targetId),
          maxRegistrations: Number(form.maxRegistrations), expiresAt: new Date(form.expiresAt).toISOString() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create the registration link.');
      setRegistrationPath(data.registrationPath);
    } catch (error) {
      Swal.fire('Link not created', error.message, 'error');
    } finally { setSubmitting(false); }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${registrationPath}`);
      Swal.fire({ icon: 'success', title: 'Link copied', timer: 1400, showConfirmButton: false });
    } catch {
      Swal.fire('Unable to copy link', 'Copy the link shown in the dialog instead.', 'error');
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="create-link-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
        <div><h3 id="create-link-title" className="font-black text-gray-900">Create a registration link</h3><p className="mt-1 text-xs text-gray-500">The link will be active immediately and appear in Registration Management.</p></div>
        <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="Close link form"><X size={19} /></button>
      </div>
      {registrationPath ? <div className="space-y-4 p-5">
        <p className="text-sm font-semibold text-emerald-700">Registration link created and ready to share.</p>
        <p className="break-all rounded-lg bg-gray-50 p-3 text-xs text-gray-700">{window.location.origin}{registrationPath}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white"><Clipboard size={16} /> Copy link</button>
          <button type="button" onClick={onViewLinks} className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-4 py-2.5 text-sm font-bold text-white"><Link2 size={16} /> View in Registration Management</button>
        </div>
      </div> : <form onSubmit={submit} className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold text-gray-700">Account type
            <select value={form.accountType} onChange={event => setForm({ ...form, accountType: Number(event.target.value), targetId: '' })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="2">Regular Office Staff</option><option value="1">Faculty Staff</option></select>
          </label>
          <label className="text-xs font-bold text-gray-700">Assigned {form.accountType === 1 ? 'department' : 'office'}
            <select required value={form.targetId} onChange={event => setForm({ ...form, targetId: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="">Choose...</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
          </label>
          <label className="text-xs font-bold text-gray-700">Account limit
            <input required type="number" min="1" max="100" value={form.maxRegistrations} onChange={event => setForm({ ...form, maxRegistrations: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal" />
          </label>
          <label className="text-xs font-bold text-gray-700">Expiration
            <input required type="datetime-local" value={form.expiresAt} onChange={event => setForm({ ...form, expiresAt: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal" />
          </label>
          <label className="text-xs font-bold text-gray-700 md:col-span-2">Reason or note <span className="font-normal text-gray-400">(optional)</span>
            <textarea maxLength={500} value={form.requestNote} onChange={event => setForm({ ...form, requestNote: event.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-600 disabled:opacity-50">Cancel</button>
          <button disabled={submitting || !form.targetId} className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Link2 size={16} />{submitting ? 'Creating...' : 'Create link'}</button>
        </div>
      </form>}
    </div>
  </div>;
}
