import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import CustomRouteReview from './CustomRouteReview';
import WorkflowEditorModal from '../modals/WorkflowEditorModal';

const PAGE_SIZE = 8;

const sections = [
  { id: 'offices', label: 'Office locations', description: 'Add offices, see assigned staff, and keep office categories organized.' },
  { id: 'departments', label: 'Departments', description: 'Maintain the university departments available for account registration.' },
  { id: 'categories', label: 'Document types', description: 'Group document workflows under clear, familiar document types.' },
  { id: 'workflows', label: 'Document workflows', description: 'Set the offices that receive each document, in the correct order.' },
  { id: 'requests', label: 'Additional routing', description: 'Review routing requests submitted by offices and users.' }
];

function RecordModal({ dialog, onClose, onSave, officeCategories }) {
  const [name, setName] = useState(() => dialog?.record?.name || dialog?.record?.category_name || '');
  const [description, setDescription] = useState(() => dialog?.record?.description || '');
  const [category, setCategory] = useState(() => dialog?.record?.category || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!dialog) return null;
  const isOffice = dialog.kind === 'office';
  const isCategory = dialog.kind === 'category';
  const title = `${dialog.record ? 'Edit' : 'Add'} ${isOffice ? 'office location' : isCategory ? 'document type' : 'department'}`;

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        id: dialog.record?.id || dialog.record?.category_id,
        name: name.trim(),
        category: category.trim(),
        description: description.trim()
      });
      onClose();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="record-dialog-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/30 dark:border-[#42292f] bg-white dark:bg-[#180e10] text-left shadow-2xl">
        <header className="flex items-center justify-between bg-[#8c1023] dark:bg-red-950 px-6 py-5 text-white">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">System management</p><h2 id="record-dialog-title" className="mt-1 text-xl font-black">{title}</h2></div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-lg text-white/80 hover:bg-white/10 hover:text-white cursor-pointer" aria-label="Close">×</button>
        </header>
        <form onSubmit={submit} className="space-y-5 p-6 text-left">
          <label className="block text-sm font-bold text-neutral-800 dark:text-gray-200" htmlFor="record-name">
            {isOffice ? 'Office name' : isCategory ? 'Document type name' : 'Department name'}
            <input id="record-name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#8c1023] focus:ring-2 focus:ring-rose-100" />
          </label>
          {isOffice && <label className="block text-sm font-bold text-neutral-800 dark:text-gray-200" htmlFor="record-category">
            Office category <span className="font-normal text-neutral-500 dark:text-gray-400">(optional)</span>
            <input id="record-category" list="office-category-options" maxLength={150} value={category} onChange={event => setCategory(event.target.value)} placeholder="e.g. Academic services" className="mt-2 w-full rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#8c1023] focus:ring-2 focus:ring-rose-100" />
            <datalist id="office-category-options">{officeCategories.map(item => <option key={item} value={item} />)}</datalist>
          </label>}
          {isCategory && <label className="block text-sm font-bold text-neutral-800 dark:text-gray-200" htmlFor="record-description">
            Description <span className="font-normal text-neutral-500 dark:text-gray-400">(optional)</span>
            <textarea id="record-description" rows={3} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Briefly describe the documents in this type." className="mt-2 w-full resize-y rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#8c1023] focus:ring-2 focus:ring-rose-100" />
          </label>}
          {error && <p role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-900/30 p-3 text-sm font-medium text-rose-800 dark:text-rose-300">{error}</p>}
          <footer className="flex justify-end gap-3 border-t border-neutral-100 dark:border-[#42292f] pt-5"><button type="button" onClick={onClose} className="rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#180e10] px-4 py-2.5 text-sm font-bold text-neutral-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-gray-800 cursor-pointer">Cancel</button><button disabled={saving} type="submit" className="rounded-lg bg-[#8c1023] dark:bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-[#700b1c] dark:hover:bg-red-800 disabled:opacity-60 cursor-pointer">{saving ? 'Saving…' : dialog.record ? 'Save changes' : 'Add new'}</button></footer>
        </form>
      </section>
    </div>
  );
}

function Pagination({ currentPage, totalItems, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (totalItems <= PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-between border-t border-neutral-100 dark:border-[#42292f] px-4 py-3 text-sm text-neutral-600 dark:text-gray-400 bg-white dark:bg-[#180e10]">
      <span>Page {currentPage} of {pageCount}</span>
      <div className="flex gap-2">
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-lg border border-neutral-300 dark:border-gray-700 p-1.5 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer text-neutral-700 dark:text-gray-300" aria-label="Previous page"><ChevronLeft size={17} /></button>
        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === pageCount} className="rounded-lg border border-neutral-300 dark:border-gray-700 p-1.5 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer text-neutral-700 dark:text-gray-300" aria-label="Next page"><ChevronRight size={17} /></button>
      </div>
    </div>
  );
}

function WorkflowRoute({ workflow }) {
  const stops = Array.from({ length: 7 }, (_, index) => {
    const step = index + 1;
    return workflow[`stop_${step}_kind`] === 'group' ? `${workflow[`stop_${step}_group_name`]} category` : workflow[`stop_${step}_name`];
  }).filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stops.map((name, index) => (
        <span key={`${name}-${index}`} className="inline-flex items-center gap-1.5">
          <span className="rounded-md bg-neutral-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-neutral-700 dark:text-gray-300">{name}</span>
          {index < stops.length - 1 && <span className="text-neutral-400">→</span>}
        </span>
      ))}
    </div>
  );
}

export default function SystemManagementTab({ matrixProps, section = 'offices' }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const current = sections.find(item => item.id === section) || sections[0];
  const officeCategories = useMemo(() => [...new Set(matrixProps.offices.map(office => office.category).filter(Boolean))].sort(), [matrixProps.offices]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = value => String(value || '').toLowerCase().includes(needle);
    if (section === 'offices') return (matrixProps.infraSummary.officeCapacity || []).filter(row => (filter === 'all' || (filter === 'uncategorized' ? !row.office_category : row.office_category === filter)) && (matches(row.office_name) || matches(row.office_category)));
    if (section === 'departments') return (matrixProps.infraSummary.departments || []).filter(row => matches(row.name));
    if (section === 'categories') return matrixProps.categories.filter(row => (filter === 'all' || (filter === 'in-use' ? row.pipeline_count > 0 : row.pipeline_count === 0)) && (matches(row.category_name) || matches(row.description)));
    if (section === 'workflows') return matrixProps.processTypes.filter(row => (filter === 'all' || (filter === 'active' ? row.is_active !== false : row.is_active === false) || row.category_id === Number(filter)) && (matches(row.process_name) || matches(row.category_name)));
    return [];
  }, [section, query, filter, matrixProps.infraSummary, matrixProps.categories, matrixProps.processTypes]);

  const displayedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const openCreate = () => {
    if (section === 'workflows') return matrixProps.openWorkflowEditor();
    if (section !== 'requests') setDialog({ kind: section.slice(0, -1), record: null });
  };
  const saveDialog = async values => {
    if (dialog.kind === 'office') return matrixProps.saveOffice(values);
    if (dialog.kind === 'department') return matrixProps.saveDepartment(values);
    return matrixProps.saveCategory(values);
  };
  const actionLabel = section === 'workflows' ? 'Add workflow' : section === 'requests' ? null : `Add ${section === 'offices' ? 'office' : section === 'categories' ? 'document type' : 'department'}`;

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      <div className="rounded-2xl border border-rose-100 dark:border-[#42292f] bg-white dark:bg-[#180e10] p-5 shadow-sm md:p-6">
        <p className="max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-gray-400">Manage office locations, document types, and document workflows in one consistent workspace. Open a record to see its details; use the actions to make changes.</p>
      </div>

      {matrixProps.catalogError && (
        <p role="alert" className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/30 p-4 text-sm text-rose-800 dark:text-rose-300">
          {matrixProps.catalogError} <button type="button" onClick={matrixProps.refreshCatalogs} className="font-bold underline cursor-pointer">Try again</button>
        </p>
      )}

      <div className="rounded-2xl border border-neutral-200 dark:border-[#42292f] bg-white dark:bg-[#180e10] shadow-sm overflow-hidden">
        {section === 'requests' ? (
          <div className="p-4 md:p-6"><CustomRouteReview onChanged={matrixProps.refreshCatalogs} /></div>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-4 p-4 md:flex-row md:items-end md:p-6 bg-gray-50/50 dark:bg-[#1c1113]">
              <div>
                <h3 className="text-lg font-black text-neutral-900 dark:text-white">{current.label}</h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-gray-400">{current.description}</p>
              </div>
              {actionLabel && (
                <button type="button" onClick={openCreate} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#8c1023] dark:bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#700b1c] dark:hover:bg-red-800 cursor-pointer">
                  <Plus size={17} /> {actionLabel}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 border-y border-neutral-100 dark:border-[#42292f] bg-neutral-50/70 dark:bg-[#1c1113] p-4 md:flex-row md:items-center">
              <label className="relative block flex-1" htmlFor="management-search">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <span className="sr-only">Search {current.label}</span>
                <input id="management-search" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder={`Search ${current.label.toLowerCase()}…`} className="w-full rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#180e10] text-neutral-900 dark:text-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#8c1023] focus:ring-2 focus:ring-rose-100" />
              </label>
              {section === 'offices' && <select aria-label="Filter office locations" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }} className="rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#180e10] text-neutral-900 dark:text-white px-3 py-2.5 text-sm cursor-pointer"><option value="all">All categories</option><option value="uncategorized">No category</option>{officeCategories.map(item => <option key={item} value={item}>{item}</option>)}</select>}
              {section === 'categories' && <select aria-label="Filter document types" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }} className="rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#180e10] text-neutral-900 dark:text-white px-3 py-2.5 text-sm cursor-pointer"><option value="all">All document types</option><option value="in-use">Used in workflows</option><option value="unused">Not used yet</option></select>}
              {section === 'workflows' && <select aria-label="Filter document workflows" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }} className="rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#180e10] text-neutral-900 dark:text-white px-3 py-2.5 text-sm cursor-pointer"><option value="all">All workflows</option><option value="active">Available</option><option value="hidden">Hidden</option>{matrixProps.categories.map(item => <option key={item.category_id} value={item.category_id}>{item.category_name}</option>)}</select>}
            </div>

            <div className="overflow-x-auto">
              {section === 'offices' && (
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-white dark:bg-[#1c1113] text-left text-[11px] uppercase tracking-wider text-neutral-500 dark:text-gray-400 border-b border-neutral-200 dark:border-[#42292f]">
                    <tr><th className="px-5 py-4 font-black">Office location</th><th className="px-5 py-4 font-black">Category</th><th className="px-5 py-4 font-black">Registered users</th><th className="px-5 py-4 text-right font-black">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-gray-800">
                    {displayedRows.map(row => (
                      <tr key={row.o_id} onClick={() => matrixProps.editInfrastructure('office', row.o_id, row.office_name)} className="cursor-pointer hover:bg-rose-50/40 dark:hover:bg-[#2b1317]/50 transition-colors">
                        <td className="px-5 py-4 font-bold text-neutral-900 dark:text-white">{row.office_name}</td>
                        <td className="px-5 py-4 text-neutral-600 dark:text-gray-400">{row.office_category || 'Not assigned'}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.staff_count ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' : 'bg-neutral-100 dark:bg-gray-800 text-neutral-600 dark:text-gray-400'}`}>{row.staff_count} {row.staff_count === 1 ? 'user' : 'users'}</span></td>
                        <td className="px-5 py-4 text-right">
                          <button type="button" onClick={event => { event.stopPropagation(); matrixProps.editInfrastructure('office', row.o_id, row.office_name); }} className="mr-3 text-xs font-bold text-[#8c1023] dark:text-red-400 underline cursor-pointer">View details</button>
                          <button type="button" onClick={event => { event.stopPropagation(); matrixProps.deleteInfrastructure('office', row.o_id, row.office_name); }} className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 dark:text-rose-400 underline cursor-pointer"><Trash2 size={13} /> Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {section === 'departments' && (
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-white dark:bg-[#1c1113] text-left text-[11px] uppercase tracking-wider text-neutral-500 dark:text-gray-400 border-b border-neutral-200 dark:border-[#42292f]">
                    <tr><th className="px-5 py-4 font-black">Department</th><th className="px-5 py-4 text-right font-black">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-gray-800">
                    {displayedRows.map(row => (
                      <tr key={row.id} className="hover:bg-rose-50/40 dark:hover:bg-[#2b1317]/50 transition-colors">
                        <td className="px-5 py-4 font-bold text-neutral-900 dark:text-white">{row.name}</td>
                        <td className="px-5 py-4 text-right">
                          <button type="button" onClick={() => setDialog({ kind: 'department', record: row })} className="mr-3 inline-flex items-center gap-1 text-xs font-bold text-[#8c1023] dark:text-red-400 underline cursor-pointer"><Pencil size={13} /> Edit</button>
                          <button type="button" onClick={() => matrixProps.deleteInfrastructure('department', row.id, row.name)} className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 dark:text-rose-400 underline cursor-pointer"><Trash2 size={13} /> Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {section === 'categories' && (
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-white dark:bg-[#1c1113] text-left text-[11px] uppercase tracking-wider text-neutral-500 dark:text-gray-400 border-b border-neutral-200 dark:border-[#42292f]">
                    <tr><th className="px-5 py-4 font-black">Document type</th><th className="px-5 py-4 font-black">Description</th><th className="px-5 py-4 font-black">Workflows</th><th className="px-5 py-4 text-right font-black">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-gray-800">
                    {displayedRows.map(row => (
                      <tr key={row.category_id} className="hover:bg-rose-50/40 dark:hover:bg-[#2b1317]/50 transition-colors">
                        <td className="px-5 py-4 font-bold text-neutral-900 dark:text-white">{row.category_name}</td>
                        <td className="max-w-sm px-5 py-4 text-neutral-600 dark:text-gray-400">{row.description || 'No description'}</td>
                        <td className="px-5 py-4"><span className="rounded-full bg-neutral-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-bold text-neutral-700 dark:text-gray-300">{row.pipeline_count} {row.pipeline_count === 1 ? 'workflow' : 'workflows'}</span></td>
                        <td className="px-5 py-4 text-right">
                          <button type="button" onClick={() => setDialog({ kind: 'category', record: row })} className="mr-3 inline-flex items-center gap-1 text-xs font-bold text-[#8c1023] dark:text-red-400 underline cursor-pointer"><Pencil size={13} /> Edit</button>
                          <button type="button" disabled={row.pipeline_count > 0} onClick={() => matrixProps.deleteCategory(row)} className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 dark:text-rose-400 underline disabled:cursor-not-allowed disabled:text-neutral-400 dark:disabled:text-gray-600 disabled:no-underline cursor-pointer"><Trash2 size={13} /> Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {section === 'workflows' && (
                <table className="w-full min-w-[940px] text-sm">
                  <thead className="bg-white dark:bg-[#1c1113] text-left text-[11px] uppercase tracking-wider text-neutral-500 dark:text-gray-400 border-b border-neutral-200 dark:border-[#42292f]">
                    <tr><th className="px-5 py-4 font-black">Document workflow</th><th className="px-5 py-4 font-black">Document type</th><th className="px-5 py-4 font-black">Office sequence</th><th className="px-5 py-4 font-black">Status</th><th className="px-5 py-4 text-right font-black">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-gray-800">
                    {displayedRows.map(row => (
                      <tr key={row.p_id} onClick={() => matrixProps.openWorkflowEditor(row)} className="cursor-pointer hover:bg-rose-50/40 dark:hover:bg-[#2b1317]/50 transition-colors">
                        <td className="px-5 py-4 font-bold text-neutral-900 dark:text-white">{row.process_name}</td>
                        <td className="px-5 py-4 text-neutral-600 dark:text-gray-400">{row.category_name}</td>
                        <td className="px-5 py-4"><WorkflowRoute workflow={row} /></td>
                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.is_active === false ? 'bg-neutral-200 dark:bg-gray-800 text-neutral-700 dark:text-gray-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'}`}>{row.is_active === false ? 'Hidden' : 'Available'}</span></td>
                        <td className="px-5 py-4 text-right">
                          <button type="button" onClick={event => { event.stopPropagation(); matrixProps.openWorkflowEditor(row); }} className="mr-3 inline-flex items-center gap-1 text-xs font-bold text-[#8c1023] dark:text-red-400 underline cursor-pointer"><Pencil size={13} /> Edit</button>
                          <button type="button" onClick={event => { event.stopPropagation(); matrixProps.deletePipeline(row); }} className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 dark:text-rose-400 underline cursor-pointer"><Trash2 size={13} /> Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {!rows.length && (
                <div className="px-5 py-14 text-center">
                  <p className="text-sm font-bold text-neutral-700 dark:text-gray-300">No {current.label.toLowerCase()} found.</p>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-gray-400">Try changing the search or filter, or add a new record.</p>
                </div>
              )}
            </div>
            <Pagination currentPage={page} totalItems={rows.length} onPageChange={setPage} />
          </>
        )}
      </div>

      <RecordModal key={dialog ? `${dialog.kind}-${dialog.record?.id || dialog.record?.category_id || 'new'}` : 'closed'} dialog={dialog} onClose={() => setDialog(null)} onSave={saveDialog} officeCategories={officeCategories} />
      <WorkflowEditorModal open={matrixProps.workflowEditorOpen} onClose={matrixProps.closeWorkflowEditor} onSubmit={matrixProps.handleProcessFormSubmit} formMeta={matrixProps.formMeta} setFormMeta={matrixProps.setFormMeta} newProcessName={matrixProps.newProcessName} setNewProcessName={matrixProps.setNewProcessName} categoryId={matrixProps.categoryId} setCategoryId={matrixProps.setCategoryId} categories={matrixProps.categories} selectedStops={matrixProps.selectedStops} offices={matrixProps.offices} routeGroups={matrixProps.routeGroups} handleStopKindChange={matrixProps.handleStopKindChange} handleStopSelectorChange={matrixProps.handleStopSelectorChange} handleAddStopSlot={matrixProps.handleAddStopSlot} handleRemoveTrailingStopSlot={matrixProps.handleRemoveTrailingStopSlot} />
    </div>
  );
}