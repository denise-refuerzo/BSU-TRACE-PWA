import React, { useEffect, useMemo, useState } from 'react';

export default function OfficeEditModal({ office, offices, onClose, onSave }) {
  const [mode, setMode] = useState(null);
  const [officeName, setOfficeName] = useState('');
  const [categoryEnabled, setCategoryEnabled] = useState(false);
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!office) return;
    setMode(null);
    setOfficeName(office.name || '');
    setCategory(office.category || '');
    setCategoryEnabled(Boolean(office.category));
  }, [office]);

  const categorySuggestions = useMemo(() => [...new Set((offices || []).map(item => item.category).filter(Boolean))].sort(), [offices]);
  if (!office) return null;

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        officeName: mode === 'name' ? officeName.trim() : office.name,
        officeCategory: categoryEnabled ? category.trim() : ''
      });
      setMode(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <section role="dialog" aria-modal="true" aria-labelledby="office-edit-title" className="bg-white rounded-2xl w-full max-w-xl max-h-[90dvh] flex flex-col overflow-hidden text-left shadow-2xl border border-white/30">
        <header className="bg-[#8c1023] text-white px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">Campus infrastructure</p>
            <h2 id="office-edit-title" className="text-xl font-black mt-1">Office details</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close office details" className="text-2xl leading-none text-white/80 hover:text-white">×</button>
        </header>

        <div className="overflow-y-auto p-6 space-y-5">
          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="p-4 flex items-start justify-between gap-4">
              <div><p className="text-[11px] uppercase tracking-wider font-bold text-gray-500">Office name</p><p className="mt-1 font-semibold text-gray-900">{office.name}</p></div>
              <button type="button" onClick={() => setMode('name')} className="text-xs font-bold text-[#8c1023] underline">Edit name</button>
            </div>
            <div className="p-4 flex items-start justify-between gap-4">
              <div><p className="text-[11px] uppercase tracking-wider font-bold text-gray-500">Category</p><p className="mt-1 font-semibold text-gray-900">{office.category || 'No category assigned'}</p></div>
              <button type="button" onClick={() => setMode('category')} className="text-xs font-bold text-[#8c1023] underline">Edit category</button>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500">Registered staff ({(office.staff || []).length})</p>
            {(office.staff || []).length ? <div className="mt-2 space-y-2">{office.staff.map(person => <div key={person.user_id} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-800">{person.full_name || 'Unnamed staff member'}</div>)}</div> : <p className="mt-2 text-sm text-gray-500">No staff are currently registered to this office.</p>}
          </div>

          {mode && <form onSubmit={submit} className="rounded-xl border border-red-100 bg-red-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-gray-900">Edit {mode === 'name' ? 'office name' : 'category'}</h3><button type="button" onClick={() => setMode(null)} className="text-xs text-gray-500 underline">Cancel</button></div>
            {mode === 'name' && <><label className="text-xs font-bold text-gray-600" htmlFor="office-edit-name">Office name</label><input id="office-edit-name" required value={officeName} onChange={event => setOfficeName(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></>}
            {mode === 'category' && <><label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={categoryEnabled} onChange={event => setCategoryEnabled(event.target.checked)} className="accent-[#8c1023]" /> Assign this office to a category</label>{categoryEnabled && <input type="text" list="office-edit-category-suggestions" value={category} onChange={event => setCategory(event.target.value)} placeholder="Start typing a category or create a new one" maxLength={150} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />}<datalist id="office-edit-category-suggestions">{categorySuggestions.map(item => <option key={item} value={item} />)}</datalist></>}
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#8c1023] text-white text-sm font-bold disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
          </form>}
        </div>

        <footer className="border-t border-gray-100 px-6 py-4 flex justify-end"><button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50">Close</button></footer>
      </section>
    </div>
  );
}
