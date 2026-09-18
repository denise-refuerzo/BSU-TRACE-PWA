import React, { useState } from 'react';
import { Pencil, Trash2, Plus, Users, Car, Building2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { resourceApi, confirmResourceAction, resourceError, resourceSuccess } from '../resourceActions';

const input = 'w-full mt-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-red-800 outline-none';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold shadow-2xs transition-colors hover:bg-gray-50 cursor-pointer disabled:opacity-50';

export default function ResourceRegistry({ assets, fleet, onRefresh, viewMode = 'facilities' }) {
  const [editor, setEditor] = useState(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const getFilteredRows = () => {
    let rows = [];

    if (viewMode === 'facilities') {
      rows = assets
        .filter(a => a.ast_id !== 4)
        .map(a => ({
          kind: 'assets',
          id: a.asd_id,
          name: a.asset_name,
          type: a.asset_type,
          quantity: a.quantity,
          status: a.current_status || 'Available',
          ast_id: a.ast_id,
          assetTypeId: String(a.ast_id)
        }));
    } else if (viewMode === 'vehicles') {
      rows = fleet.vehicles.map(v => ({
        kind: 'vehicles',
        id: v.vehicle_id,
        name: v.vehicle_name,
        number: v.plate_number,
        type: 'Vehicle',
        active: v.is_active,
        status: v.is_active ? 'Available' : 'Unavailable'
      }));
    } else if (viewMode === 'drivers') {
      rows = fleet.drivers.map(d => ({
        kind: 'drivers',
        id: d.driver_id,
        name: d.full_name,
        number: d.license_number,
        active: d.is_active,
        status: d.is_active ? 'Available' : 'Unavailable'
      }));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => 
        r.name?.toLowerCase().includes(q) || 
        r.number?.toLowerCase().includes(q) || 
        r.type?.toLowerCase().includes(q)
      );
    }

    return rows;
  };

  const rows = getFilteredRows();
  const totalPages = Math.ceil(rows.length / itemsPerPage) || 1;
  const paginatedRows = rows.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  async function mutate(title, text, fn) {
    if (busy) return;
    setBusy(true);
    try {
      if (!await confirmResourceAction(title, text)) return;
      const result = await fn();
      await onRefresh();
      await resourceSuccess(result.message);
    } catch (e) {
      await resourceError(e);
    } finally {
      setBusy(false);
    }
  }

  const remove = (row) => mutate(
    'Delete Record?',
    `Are you sure you want to delete ${row.name}?`,
    () => resourceApi(`registry/${row.kind}/${row.id}`, 'DELETE')
  );

  async function save(e) {
    e.preventDefault();
    await mutate(
      editor.id ? 'Save Changes?' : 'Create Entry?',
      `Save details for ${editor.name}?`,
      async () => {
        const path = editor.id
          ? `registry/${editor.kind}/${editor.id}`
          : editor.kind === 'assets'
            ? 'assets'
            : `fleet/${editor.kind}`;
        const result = await resourceApi(path, editor.id ? 'PUT' : 'POST', {
          ...editor,
          assetName: editor.name,
          assetTypeId: editor.assetTypeId || '1'
        });
        setEditor(null);
        return result;
      }
    );
  }

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-xl bg-white outline-none focus:ring-1 focus:ring-red-800"
          />
        </div>

        <div>
          {viewMode === 'facilities' && (
            <button
              onClick={() => setEditor({ kind: 'assets', name: '', quantity: 1, assetTypeId: '1' })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Plus size={14} /> Add Facility
            </button>
          )}
          {viewMode === 'vehicles' && (
            <button
              onClick={() => setEditor({ kind: 'vehicles', name: '', number: '', active: true })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Plus size={14} /> Register Vehicle
            </button>
          )}
          {viewMode === 'drivers' && (
            <button
              onClick={() => setEditor({ kind: 'drivers', name: '', number: '', active: true })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Plus size={14} /> Register Driver
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">{viewMode === 'drivers' ? 'Driver Name' : 'Asset / Resource'}</th>
              <th className="px-4 py-3">{viewMode === 'drivers' ? 'License Number' : 'Type / Details'}</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {paginatedRows.map(row => (
              <tr key={`${row.kind}-${row.id}`} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-4 py-3.5 font-semibold text-gray-900">
                  <div className="flex items-center gap-2.5">
                    <span className={`p-2 rounded-lg shrink-0 ${
                      viewMode === 'drivers' ? 'bg-blue-50 text-blue-600' : viewMode === 'vehicles' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-800'
                    }`}>
                      {viewMode === 'drivers' ? <Users size={15} /> : viewMode === 'vehicles' ? <Car size={15} /> : <Building2 size={15} />}
                    </span>
                    <span>{row.name}</span>
                  </div>
                </td>

                <td className="px-4 py-3.5 text-xs text-gray-600">
                  {row.number || row.type}
                </td>

                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    row.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {row.status}
                  </span>
                </td>

                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {row.kind !== 'assets' && (
                      <button
                        disabled={busy}
                        className={button}
                        onClick={() => mutate(
                          'Update Status?',
                          `Mark ${row.name} as ${row.active ? 'Unavailable' : 'Available'}?`,
                          () => resourceApi(`fleet/${row.kind}/${row.id}/active`, 'PUT', { active: !row.active })
                        )}
                      >
                        {row.active ? 'Set Unavailable' : 'Set Available'}
                      </button>
                    )}
                    <button
                      disabled={busy}
                      title="Edit"
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 cursor-pointer"
                      onClick={() => setEditor({ ...row })}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      disabled={busy}
                      title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-700 rounded-lg hover:bg-red-50 cursor-pointer"
                      onClick={() => remove(row)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-xs text-gray-500 bg-gray-50/50">
                  No records found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4 border-t border-gray-100 bg-white text-xs">
          <span className="text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-900">{paginatedRows.length}</span> of <span className="font-bold text-gray-900">{rows.length}</span> records
          </span>
          <div className="flex gap-2">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage(page - 1)} 
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold text-gray-700 shadow-2xs cursor-pointer transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 font-black text-gray-900">
              {page} / {totalPages}
            </span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(page + 1)} 
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 font-bold text-gray-700 shadow-2xs cursor-pointer transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* MODAL */}
      {editor && (
        <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex justify-center items-center p-4">
          <form role="dialog" onSubmit={save} className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6 space-y-4 text-left">
            <h3 className="font-bold text-base text-gray-900">
              {editor.id ? 'Edit Information' : viewMode === 'drivers' ? 'Register Driver' : viewMode === 'vehicles' ? 'Register Vehicle' : 'Add Facility'}
            </h3>

            <fieldset disabled={busy} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Name</label>
                <input required maxLength={editor.kind === 'assets' ? 100 : 255} value={editor.name} onChange={e => setEditor({ ...editor, name: e.target.value })} className={input} />
              </div>

              {editor.kind === 'assets' ? (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Type</label>
                    <select value={editor.assetTypeId} onChange={e => setEditor({ ...editor, assetTypeId: e.target.value })} className={input}>
                      <option value="1">Room</option>
                      <option value="2">Gymnasium</option>
                      <option value="3">General Facility</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Room Capacity / Quantity</label>
                    <input required type="number" min="1" step="1" value={editor.quantity} onChange={e => setEditor({ ...editor, quantity: e.target.value })} className={input} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">{editor.kind === 'vehicles' ? 'Plate Number' : 'License Number'}</label>
                    <input required value={editor.number} onChange={e => setEditor({ ...editor, number: e.target.value })} className={input} />
                  </div>
                  {editor.id && (
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Availability Status</label>
                      <select value={String(editor.active)} onChange={e => setEditor({ ...editor, active: e.target.value === 'true' })} className={input}>
                        <option value="true">Available</option>
                        <option value="false">Unavailable</option>
                      </select>
                    </div>
                  )}
                </>
              )}
            </fieldset>

            <footer className="flex justify-end gap-2 border-t pt-4">
              <button disabled={busy} type="button" onClick={() => setEditor(null)} className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button disabled={busy} className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold">
                {busy ? 'Saving...' : 'Save'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}