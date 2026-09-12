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
  return <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm" aria-labelledby="categories-heading">
    <h3 id="categories-heading" className="font-bold text-gray-900">Document Categories</h3>
    <p className="text-xs text-gray-500 mt-1 mb-4">Group pipelines for easier discovery. Reassign all pipelines before deleting a category.</p>
    <div className="grid md:grid-cols-2 gap-6">
      <form onSubmit={save} className="space-y-3">
        <label className="block text-sm font-medium">Category name
          <input required maxLength={100} value={name} onChange={e => setName(e.target.value)} className="block w-full border rounded-lg p-2 mt-1" />
        </label>
        <label className="block text-sm font-medium">Description <span className="font-normal text-gray-500">(optional)</span>
          <textarea maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} className="block w-full border rounded-lg p-2 mt-1" rows={2} />
        </label>
        <div className="flex gap-3">
          <button disabled={busy} className="bg-red-800 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Saving...' : editing ? 'Save Category' : 'Add Category'}</button>
          {editing && <button type="button" disabled={busy} onClick={reset} className="text-sm underline">Cancel Edit</button>}
        </div>
        <p role="status" className="text-sm">{message}</p>
      </form>
      <ul className="space-y-2 max-h-72 overflow-y-auto">
        {categories.map(c => <li key={c.category_id} className="border rounded-lg p-3">
          <div className="flex justify-between gap-3">
            <span className="font-semibold text-sm break-words">{c.category_name}</span>
            <div className="flex gap-3 text-xs shrink-0">
              <button type="button" disabled={busy} aria-label={`Edit ${c.category_name}`} onClick={() => { setEditing(c.category_id); setName(c.category_name); setDescription(c.description); setMessage(''); }} className="text-red-800 underline">Edit</button>
              <button type="button" disabled={busy || c.pipeline_count > 0} title={c.pipeline_count > 0 ? 'Reassign all pipelines first' : 'Delete category'} aria-label={`Delete ${c.category_name}`} onClick={() => remove(c)} className="text-red-800 underline disabled:text-gray-400 disabled:no-underline">Delete</button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 break-words">{c.description}</p>
          <p className="text-xs text-gray-500 mt-1">{c.pipeline_count} pipelines · {c.active_pipeline_count} active</p>
        </li>)}
        {!categories.length && <li className="text-sm text-gray-500">No categories loaded. Add a category to get started.</li>}
      </ul>
    </div>
  </section>;
}
