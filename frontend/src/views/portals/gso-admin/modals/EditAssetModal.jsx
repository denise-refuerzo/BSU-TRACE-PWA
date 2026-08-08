import React from 'react';
import { X, Calendar } from 'lucide-react';

export default function EditAssetModal({
  showEditAssetModal,
  setShowEditAssetModal,
  selectedEditAsset,
  setSelectedEditAsset,
  handleUpdateAsset,
  assetSchedule
}) {
  if (!showEditAssetModal || !selectedEditAsset) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col text-left">
        <div className="p-4 border-b bg-[#FDFBF9] flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 text-sm">Asset Details & Configuration</h3>
          <button onClick={() => setShowEditAssetModal(false)} className="text-neutral-400 hover:text-neutral-600"><X size={16} /></button>
        </div>
        
        <div className="flex flex-col md:flex-row h-[60vh] md:h-auto max-h-[80vh]">
          {/* Left Column: Edit Form */}
          <form onSubmit={handleUpdateAsset} className="p-6 md:w-1/2 space-y-4 border-b md:border-b-0 md:border-r border-neutral-100 overflow-y-auto">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Asset Name</label>
              <input 
                type="text" 
                required 
                value={selectedEditAsset.asset_name} 
                onChange={e => setSelectedEditAsset({...selectedEditAsset, asset_name: e.target.value})} 
                className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-lg focus:ring-1 focus:ring-red-700 outline-none" 
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Asset Type</label>
              <input 
                type="text" 
                readOnly
                value={selectedEditAsset.asset_type === 'Furniture' ? 'Equipment' : selectedEditAsset.asset_type} 
                className="w-full px-4 py-2 text-xs border border-neutral-200 bg-neutral-50 text-neutral-500 rounded-lg outline-none cursor-not-allowed" 
              />
            </div>

            {selectedEditAsset.ast_id === 3 && (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Total Quantity Stock</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  value={selectedEditAsset.quantity} 
                  onChange={e => setSelectedEditAsset({...selectedEditAsset, quantity: e.target.value})} 
                  className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-lg focus:ring-1 focus:ring-red-700 outline-none" 
                />
              </div>
            )}

            <div className="pt-6 border-t border-neutral-100 mt-auto">
              <button type="submit" className="w-full py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-xs uppercase tracking-wide text-xs">Save Changes</button>
            </div>
          </form>

          {/* Right Column: Upcoming Schedule */}
          <div className="p-6 md:w-1/2 bg-neutral-50/50 overflow-y-auto">
            <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar size={14} className="text-red-800"/> Confirmed Schedule
            </h4>
            
            <div className="space-y-3">
              {assetSchedule.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-400 text-xs font-bold">
                  No upcoming confirmed reservations.
                </div>
              ) : (
                assetSchedule.map((sched, idx) => {
                  const dateObj = new Date(sched.reservation_date);
                  return (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-neutral-900 text-xs">{dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-[10px] font-mono font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded">
                          {sched.start_time.substring(0,5)} - {sched.end_time.substring(0,5)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 font-medium">For: <span className="font-bold">{sched.purpose}</span></p>
                      <p className="text-[10px] text-neutral-400">By: {sched.requestor}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}