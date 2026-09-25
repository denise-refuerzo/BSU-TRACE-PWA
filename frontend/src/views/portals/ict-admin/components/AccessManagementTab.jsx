import { useEffect, useMemo, useState } from 'react';
import { Building2, Landmark, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { fetchWithAuth } from '../../../../api';

const emptyDraft = {
  scopeType: 'office', targetId: '', positionTitle: '', canViewSubmissions: true,
  canRecommend: false, canApprove: false, canRequestRegistration: false,
  startsOn: '', endsOn: '', isActive: true
};

export default function AccessManagementTab({ accounts, offices, departments, fixedUserId = '', embedded = false }) {
  const [userId, setUserId] = useState(fixedUserId);
  const [officeFilter, setOfficeFilter] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedUser = accounts.find(account => String(account.u_id) === String(userId));
  const choices = draft.scopeType === 'office' ? offices : departments;
  const sortedAccounts = useMemo(() => [...accounts].sort((a, b) => a.full_name.localeCompare(b.full_name)), [accounts]);
  const matchingAccounts = useMemo(() => {
    const query = personQuery.trim().toLowerCase();
    return sortedAccounts
      .filter(account => !officeFilter || (officeFilter === 'unassigned' ? !account.o_id : String(account.o_id) === officeFilter))
      .filter(account => !query || [account.full_name, account.username, account.uni_email, account.office_name, account.department_name]
        .some(value => String(value || '').toLowerCase().includes(query)))
      .slice(0, 8);
  }, [officeFilter, personQuery, sortedAccounts]);

  const choosePerson = account => {
    setUserId(String(account.u_id));
    setPersonQuery(account.full_name);
    setAssignments([]);
    setShowSuggestions(false);
  };

  const changeOfficeFilter = value => {
    setOfficeFilter(value);
    setUserId('');
    setPersonQuery('');
    setAssignments([]);
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetchWithAuth(`/api/account-access/${userId}`)
      .then(async response => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data.error || 'Unable to load assignments.');
        setAssignments(data.map(item => ({
          scopeType: item.scope_type,
          targetId: String(item.scope_type === 'office' ? item.office_id : item.department_id),
          positionTitle: item.position_title || '',
          canViewSubmissions: item.can_view_submissions,
          canRecommend: item.can_recommend,
          canApprove: item.can_approve,
          canRequestRegistration: item.can_request_registration,
          startsOn: item.starts_on?.slice(0, 10) || '',
          endsOn: item.ends_on?.slice(0, 10) || '',
          isActive: item.is_active,
          name: item.office_name || item.department_name
        })));
      })
      .catch(error => active && Swal.fire('Unable to load access', error.message, 'error'))
      .finally(() => active && setLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [userId]);

  const addAssignment = () => {
    if (!draft.targetId) return Swal.fire('Choose an area', `Choose an ${draft.scopeType} first.`, 'warning');
    if (!draft.canViewSubmissions && !draft.canRecommend && !draft.canApprove && !draft.canRequestRegistration) {
      return Swal.fire('Choose a responsibility', 'Select at least one thing this person can do.', 'warning');
    }
    if (assignments.some(item => item.scopeType === draft.scopeType && String(item.targetId) === String(draft.targetId))) {
      return Swal.fire('Already added', 'That office or department is already in the list.', 'info');
    }
    const name = choices.find(item => String(item.id) === String(draft.targetId))?.name || '';
    setAssignments(current => [...current, { ...draft, name }]);
    setDraft(current => ({ ...emptyDraft, scopeType: current.scopeType }));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const response = await fetchWithAuth(`/api/account-access/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ assignments: assignments.map(item => ({
          scopeType: item.scopeType,
          officeId: item.scopeType === 'office' ? Number(item.targetId) : null,
          departmentId: item.scopeType === 'department' ? Number(item.targetId) : null,
          positionTitle: item.positionTitle,
          canViewSubmissions: item.canViewSubmissions,
          canRecommend: item.canRecommend,
          canApprove: item.canApprove,
          canRequestRegistration: item.canRequestRegistration,
          startsOn: item.startsOn || null,
          endsOn: item.endsOn || null,
          isActive: item.isActive
        })) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save changes.');
      await Swal.fire('Changes saved', 'Submission access and approval responsibilities are now up to date.', 'success');
    } catch (error) {
      await Swal.fire('Changes not saved', error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {!embedded && <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900"><ShieldCheck className="text-red-700" /> Access & Responsibilities</h2>
        <p className="mt-1 text-sm text-gray-500">Choose who can view submissions or handle requests for an office or department.</p>
      </div>}

      {!fixedUserId && <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(220px,0.4fr)_minmax(320px,1fr)]">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-700">Office filter
            <select value={officeFilter} onChange={event => changeOfficeFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal normal-case outline-none focus:border-red-700">
              <option value="">All offices</option>
              {offices.map(office => <option key={office.id} value={String(office.id)}>{office.name}</option>)}
              <option value="unassigned">No assigned office</option>
            </select>
          </label>
          <div className="relative">
            <label htmlFor="person-search" className="block text-xs font-bold uppercase tracking-wide text-gray-700">Find a person</label>
            <input
              id="person-search"
              type="search"
              autoComplete="off"
              value={personQuery}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
              onChange={event => {
                setPersonQuery(event.target.value);
                setUserId('');
                setAssignments([]);
                setShowSuggestions(true);
              }}
              placeholder="Type a name, username, or email..."
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
            />
            {showSuggestions && <div role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
              {matchingAccounts.length === 0 ? <p className="px-3 py-4 text-sm text-gray-500">No matching people found.</p> : matchingAccounts.map(account => (
                <button
                  key={account.u_id}
                  type="button"
                  role="option"
                  aria-selected={String(account.u_id) === userId}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => choosePerson(account)}
                  className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                >
                  <span className="block text-sm font-bold text-gray-900">{account.full_name}</span>
                  <span className="block text-xs text-gray-500">{account.office_name || account.department_name || 'No assigned area'}{account.uni_email ? ` · ${account.uni_email}` : ''}</span>
                </button>
              ))}
            </div>}
          </div>
        </div>
        {selectedUser && <p className="mt-3 text-xs text-gray-500">Assigned area: {selectedUser.office_name || selectedUser.department_name || 'Not assigned'}</p>}
      </section>}

      {userId && <>
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-gray-900">Add access for an area</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-gray-700">Applies to
              <select value={draft.scopeType} onChange={event => setDraft({ ...emptyDraft, scopeType: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal">
                <option value="office">Office</option><option value="department">Department</option>
              </select>
            </label>
            <label className="text-xs font-bold text-gray-700">{draft.scopeType === 'office' ? 'Office' : 'Department'}
              <select value={draft.targetId} onChange={event => setDraft({ ...draft, targetId: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal">
                <option value="">Choose...</option>{choices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-gray-700 md:col-span-2">Title or responsibility <span className="font-normal text-gray-400">(optional)</span>
              <input value={draft.positionTitle} onChange={event => setDraft({ ...draft, positionTitle: event.target.value })} placeholder="e.g. Department Chair or Office Head" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal" />
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[['canViewSubmissions', 'See submissions'], ['canRecommend', 'Recommend requests'], ['canApprove', 'Approve requests'], ['canRequestRegistration', 'Request registration links']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm font-semibold text-gray-700"><input type="checkbox" checked={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.checked })} /> {label}</label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-gray-700">Starts on <span className="font-normal text-gray-400">(optional)</span><input type="date" value={draft.startsOn} onChange={event => setDraft({ ...draft, startsOn: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal" /></label>
            <label className="text-xs font-bold text-gray-700">Ends on <span className="font-normal text-gray-400">(optional)</span><input type="date" min={draft.startsOn || undefined} value={draft.endsOn} onChange={event => setDraft({ ...draft, endsOn: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal" /></label>
          </div>
          <button type="button" onClick={addAssignment} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800"><Plus size={16} /> Add to list</button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5"><h3 className="font-bold text-gray-900">Assigned access</h3><p className="mt-1 text-xs text-gray-500">These changes take effect after you select Save changes.</p></div>
          {loading ? <p className="p-8 text-center text-sm text-gray-500">Loading access...</p> : assignments.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No additional access or responsibilities assigned.</p> : <div className="divide-y divide-gray-100">
            {assignments.map((item, index) => <div key={`${item.scopeType}-${item.targetId}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">{item.scopeType === 'office' ? <Building2 className="mt-0.5 text-blue-600" size={18} /> : <Landmark className="mt-0.5 text-emerald-600" size={18} />}<div><p className="font-bold text-gray-900">{item.name}</p><p className="text-xs text-gray-500">{[item.canViewSubmissions && 'See submissions', item.canRecommend && 'Recommend requests', item.canApprove && 'Approve requests', item.canRequestRegistration && 'Request registration links'].filter(Boolean).join(' · ')}</p>{item.positionTitle && <p className="mt-1 text-xs font-semibold text-gray-700">{item.positionTitle}</p>}</div></div>
              <button type="button" onClick={() => setAssignments(current => current.filter((_, rowIndex) => rowIndex !== index))} className="inline-flex items-center gap-1 self-start rounded-lg px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 size={14} /> Remove</button>
            </div>)}
          </div>}
          <div className="flex justify-end border-t border-gray-100 p-4"><button type="button" disabled={saving} onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-red-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-900 disabled:opacity-60"><Save size={16} /> {saving ? 'Saving...' : 'Save changes'}</button></div>
        </section>
      </>}
    </div>
  );
}
