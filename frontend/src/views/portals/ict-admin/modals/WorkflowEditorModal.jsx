import { Plus, Trash2, X } from 'lucide-react';

export default function WorkflowEditorModal({
  open, onClose, onSubmit, formMeta, setFormMeta, newProcessName, setNewProcessName,
  categoryId, setCategoryId, categories, selectedStops, offices, routeGroups,
  handleStopKindChange, handleStopSelectorChange, handleAddStopSlot, handleRemoveTrailingStopSlot
}) {
  if (!open) return null;

  const editing = formMeta.currentProcessId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="workflow-editor-title" className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/30 bg-white text-left shadow-2xl">
        <header className="flex items-start justify-between bg-[#8c1023] px-6 py-5 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Document workflows</p>
            <h2 id="workflow-editor-title" className="mt-1 text-xl font-black">{editing ? 'Edit document workflow' : 'Add document workflow'}</h2>
            <p className="mt-1 text-sm text-white/80">Choose the document type and the offices that receive the document in order.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close workflow editor" className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"><X size={22} /></button>
        </header>

        <form onSubmit={onSubmit} className="overflow-y-auto p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-bold text-neutral-800" htmlFor="workflow-name">
              Workflow name
              <input id="workflow-name" required maxLength={100} value={newProcessName} onChange={event => setNewProcessName(event.target.value)} placeholder="e.g. Equipment Borrowing Request" className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#8c1023] focus:ring-2 focus:ring-rose-100" />
            </label>
            <label className="block text-sm font-bold text-neutral-800" htmlFor="workflow-category">
              Document type
              <select id="workflow-category" required value={categoryId} onChange={event => setCategoryId(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#8c1023] focus:ring-2 focus:ring-rose-100">
                <option value="">Select a document type</option>
                {categories.map(category => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-neutral-900">Office sequence</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">The first two offices are required. Add more offices only when the document needs them.</p>
              </div>
              <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#8c1023]">{selectedStops.length} of 7 steps</span>
            </div>

            <ol className="mt-4 space-y-3">
              {selectedStops.map((stop, index) => {
                const isGroup = stop?.type === 'group';
                return (
                  <li key={index} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
                    <div className="grid items-end gap-3 sm:grid-cols-[2.5rem_11rem_1fr]">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8c1023] text-sm font-black text-white">{index + 1}</span>
                      <label className="block text-xs font-bold text-neutral-700" htmlFor={`workflow-step-kind-${index}`}>
                        Choose by
                        <select id={`workflow-step-kind-${index}`} value={isGroup ? 'group' : 'office'} onChange={event => handleStopKindChange(index, event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal">
                          <option value="office">Specific office</option>
                          <option value="group">Office category</option>
                        </select>
                      </label>
                      <label className="block text-xs font-bold text-neutral-700" htmlFor={`workflow-step-${index}`}>
                        {isGroup ? 'Office category' : 'Office'} {index < 2 ? <span className="text-rose-700">(required)</span> : null}
                        <select id={`workflow-step-${index}`} required={index < 2} value={isGroup ? (stop.groupId || '') : (stop || '')} onChange={event => handleStopSelectorChange(index, event.target.value)} className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal">
                          <option value="">Select {isGroup ? 'a category' : 'an office'}</option>
                          {isGroup
                            ? routeGroups.filter(group => group.offices?.length).map(group => <option key={group.group_id} value={group.group_id}>{group.group_name} ({group.offices.length} offices)</option>)
                            : offices.map(office => <option key={office.id} value={office.id}>{office.name}</option>)}
                        </select>
                      </label>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={handleAddStopSlot} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50"><Plus size={16} /> Add office step</button>
              <button type="button" onClick={handleRemoveTrailingStopSlot} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-[#8c1023] hover:bg-rose-100"><Trash2 size={16} /> Remove final step</button>
            </div>
          </div>

          {editing && <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div><h3 className="text-sm font-bold text-neutral-900">Availability</h3><p className="mt-1 text-xs text-neutral-500">Inactive workflows are hidden from new document submissions but remain in the records.</p></div>
            <button type="button" onClick={() => setFormMeta({ ...formMeta, is_active: !formMeta.is_active })} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${formMeta.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'}`}>{formMeta.is_active ? 'Available' : 'Hidden'}</button>
          </div>}

          <footer className="mt-7 flex justify-end gap-3 border-t border-neutral-100 pt-5">
            <button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50">Cancel</button>
            <button type="submit" className="rounded-lg bg-[#8c1023] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#700b1c]">{editing ? 'Save changes' : 'Add workflow'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
