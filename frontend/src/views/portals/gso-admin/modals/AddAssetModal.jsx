import React from 'react';
import { X } from 'lucide-react';

export default function AddAssetModal({
  showAddAssetModal,
  setShowAddAssetModal,
  handleAddAssetSubmit,
  assetForm,
  setAssetForm
}) {
  if (!showAddAssetModal) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden flex flex-col text-left">
        <div className="p-4 border-b bg-[#FDFBF9] flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 text-sm">Add New Institutional Asset</h3>
          <button onClick={() => setShowAddAssetModal(false)} className="text-neutral-400 hover:text-neutral-600"><X size={16} /></button>
        </div>
        
        <form onSubmit={handleAddAssetSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Asset Name</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Science Lab 302 or Bus 05" 
              value={assetForm.assetName} 
              onChange={e => setAssetForm({...assetForm, assetName: e.target.value})} 
              className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-lg focus:ring-1 focus:ring-red-700 outline-none" 
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Asset Type</label>
            <select 
              value={assetForm.assetTypeId} 
              onChange={e => setAssetForm({...assetForm, assetTypeId: e.target.value})} 
              className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-lg focus:ring-1 focus:ring-red-700 outline-none bg-white font-medium"
            >
              <option value="1">Room</option>
              <option value="2">Gymnasium</option>
              <option value="4">Vehicle</option>
              <option value="3">Equipment / Furniture</option>
            </select>
          </div>

          {assetForm.assetTypeId === '3' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Total Quantity Stock</label>
              <input 
                type="number" 
                required 
                min="1"
                placeholder="e.g. 50" 
                value={assetForm.quantity} 
                onChange={e => setAssetForm({...assetForm, quantity: e.target.value})} 
                className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-lg focus:ring-1 focus:ring-red-700 outline-none" 
              />
            </div>
          )}

          <div className="flex items-start gap-2.5 pt-4">
            <input 
              type="checkbox" 
              id="assetConfirm" 
              checked={assetForm.isConfirmed}
              onChange={e => setAssetForm({...assetForm, isConfirmed: e.target.checked})}
              className="mt-0.5 rounded text-red-800 focus:ring-red-700 w-3.5 h-3.5" 
            />
            <label htmlFor="assetConfirm" className="text-[11px] font-medium text-gray-500 leading-tight cursor-pointer">
              I confirm the accuracy of this asset information and its current availability status.
            </label>
          </div>

          <div className="flex justify-between gap-3 pt-6 border-t border-neutral-100 mt-2">
            <button type="button" onClick={() => setShowAddAssetModal(false)} className="w-1/2 py-2.5 border rounded-xl font-bold text-xs text-gray-500 hover:bg-neutral-50 uppercase tracking-wide">Cancel</button>
            <button type="submit" className="w-1/2 py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-xs uppercase tracking-wide text-xs">Add Asset</button>
          </div>
        </form>
      </div>
    </div>
  );
}