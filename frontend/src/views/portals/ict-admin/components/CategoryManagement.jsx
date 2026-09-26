import { useState } from 'react';
import { fetchWithAuth } from '../../../../api';

export default function CategoryManagement({ categories, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const reset = () => { setEditing(null); setName(''); setDescription(''); };
  async function save(e) {
    e.preventDefault();
    setBusy(true); setMessage('');
    try {
      const res = await fetchWithAuth(`/api/document-categories${editing ? `/${editing}` : ''}`, {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryName: name, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      reset(); await onChanged(); setMessage('Category saved.');
    } catch (err) { setMessage(err.message || 'Unable to save category.'); }
    finally { setBusy(false); }
  }
  async function remove(category) {
    if (!window.confirm(`Delete the empty category “${category.category_name}”?`)) return;
    setBusy(true); setMessage('');
    try {
      const res = await fetchWithAuth(`/api/document-categories/${category.category_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (editing === category.category_id) reset();
      await onChanged(); setMessage('Category deleted.');
    } catch (err) { setMessage(err.message || 'Unable to delete category.'); }
    finally { setBusy(false); }
  }
  return (
    <section className="bg-white dark:bg-[#180e10] border border-gray-200 dark:border-[#42292f] rounded-2xl p-6 shadow-sm text-left" aria-labelledby="categories-heading">
      <h3 id="categories-heading" className="font-bold text-gray-900 dark:text-white">Document Categories</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">Group pipelines for easier discovery. Reassign all pipelines before deleting a category.</p>
      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category name
            <input required maxLength={100} value={name} onChange={e => setName(e.target.value)} className="block w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-gray-900 dark:text-white rounded-lg p-2 mt-1 outline-none focus:border-[#8c1023]" />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
            <textarea maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} className="block w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-gray-900 dark:text-white rounded-lg p-2 mt-1 outline-none focus:border-[#8c1023]" rows={2} />
          </label>
          <div className="flex gap-3">
            <button disabled={busy} className="bg-red-800 dark:bg-red-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50 cursor-pointer">{busy ? 'Saving...' : editing ? 'Save Category' : 'Add Category'}</button>
            {editing && <button type="button" disabled={busy} onClick={reset} className="text-sm underline cursor-pointer text-gray-600 dark:text-gray-300">Cancel Edit</button>}
          </div>
          <p role="status" className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </form>
        <ul className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
          {categories.map(c => (
            <li key={c.category_id} className="trace-category-card border border-gray-200 dark:border-[#42292f] bg-gray-50 dark:bg-[#1c1113] rounded-xl p-3">
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-sm break-words text-gray-900 dark:text-white">{c.category_name}</span>
                <div className="flex gap-3 text-xs shrink-0">
                  <button type="button" disabled={busy} aria-label={`Edit ${c.category_name}`} onClick={() => { setEditing(c.category_id); setName(c.category_name); setDescription(c.description); setMessage(''); }} className="text-red-800 dark:text-red-400 underline cursor-pointer">Edit</button>
                  <button type="button" disabled={busy || c.pipeline_count > 0} title={c.pipeline_count > 0 ? 'Reassign all pipelines first' : 'Delete category'} aria-label={`Delete ${c.category_name}`} onClick={() => remove(c)} className="text-red-800 dark:text-red-400 underline disabled:text-gray-400 dark:disabled:text-gray-600 disabled:no-underline cursor-pointer">Delete</button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">{c.description}</p>
              <p className="inline-flex rounded-full bg-rose-50 dark:bg-rose-900/30 px-2 py-1 text-[10px] font-semibold text-rose-800 dark:text-rose-300 mt-2">{c.pipeline_count} pipelines · {c.active_pipeline_count} active</p>
            </li>
          ))}
          {!categories.length && <li className="text-sm text-gray-500 dark:text-gray-400">No categories loaded. Add a category to get started.</li>}
        </ul>
      </div>
    </section>
  );
}