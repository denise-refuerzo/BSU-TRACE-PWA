import React from 'react';
import { X, Lock } from 'lucide-react';

export default function FacilityBlackoutModal({
  showBlackoutModal,
  setShowBlackoutModal,
  handleApplyBlackout,
  blackoutForm,
  setBlackoutForm,
  assetsList,
  todayString
}) {
  if (!showBlackoutModal) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#180e10] w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 dark:border-[#42292f] overflow-hidden flex flex-col text-left">
        <div className="p-4 border-b border-neutral-200 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-2"><Lock size={16} className="text-red-800 dark:text-red-400" /> Apply Facility Blackout</h3>
          <button onClick={() => setShowBlackoutModal(false)} className="text-neutral-400 dark:text-gray-400 hover:text-neutral-600 dark:hover:text-gray-200 cursor-pointer"><X size={16} /></button>
        </div>
        
        <form onSubmit={handleApplyBlackout} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Target Asset Facility</label>
            <select required value={blackoutForm.asd_id} onChange={e => setBlackoutForm({...blackoutForm, asd_id: e.target.value})} className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] rounded-lg outline-none focus:ring-1 focus:ring-red-700 font-bold text-neutral-700 dark:text-gray-200 cursor-pointer">
              <option value="">-- Select Facility --</option>
              {assetsList.filter(a => a.ast_id !== 3).map(asset => (
                <option key={asset.asd_id} value={asset.asd_id}>{asset.asset_name} ({asset.asset_type})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Start Date</label>
              <input 
                type="date" 
                required 
                min={todayString}
                value={blackoutForm.start_time} 
                onChange={e => setBlackoutForm({...blackoutForm, start_time: e.target.value})} 
                className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">End Date</label>
              <input 
                type="date" 
                required 
                min={blackoutForm.start_time || todayString} 
                value={blackoutForm.end_time} 
                onChange={e => setBlackoutForm({...blackoutForm, end_time: e.target.value})} 
                className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" 
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Reason for Blackout (Maintenance, Repair, Event)</label>
            <input type="text" required value={blackoutForm.reason} onChange={e => setBlackoutForm({...blackoutForm, reason: e.target.value})} placeholder="e.g., Annual Maintenance" className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" />
          </div>
          <div className="flex justify-between gap-3 pt-6 border-t border-neutral-100 dark:border-[#42292f] mt-2">
            <button type="button" onClick={() => setShowBlackoutModal(false)} className="w-1/2 py-2.5 border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#180e10] rounded-xl font-bold text-xs text-gray-500 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-gray-800 uppercase tracking-wide cursor-pointer">Cancel</button>
            <button type="submit" className="w-1/2 py-2.5 bg-red-800 dark:bg-red-700 hover:bg-red-900 dark:hover:bg-red-800 text-white font-bold rounded-xl shadow-xs uppercase tracking-wide text-xs cursor-pointer">Confirm Block</button>
          </div>
        </form>
      </div>
    </div>
  );
}