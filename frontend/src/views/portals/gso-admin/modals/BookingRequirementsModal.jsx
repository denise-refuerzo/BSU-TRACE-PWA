import React from 'react';
import { X, FileText } from 'lucide-react';

export default function BookingRequirementsModal({
  showActiveChecklistModal,
  setShowActiveChecklistModal,
  activeChecklistBooking,
  activeChecklistItems,
  handleToggleChecklistItem
}) {
  if (!showActiveChecklistModal || !activeChecklistBooking) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden flex flex-col text-left">
        
        <div className="p-4 border-b bg-[#FDFBF9] flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
            <FileText size={16} className="text-red-800" /> Booking Requirements
          </h3>
          <button onClick={() => setShowActiveChecklistModal(false)} className="text-neutral-400 hover:text-neutral-600"><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col">
          <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-xl mb-4">
            <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Requestor</span>
            <p className="font-bold text-neutral-900 text-sm">{activeChecklistBooking.requestor}</p>
            <div className="flex justify-between items-end mt-2">
              <div>
                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider block">Facility</span>
                <p className="text-xs font-bold text-neutral-700">{activeChecklistBooking.booking_type}</p>
              </div>
              <div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border ${activeChecklistBooking.status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {activeChecklistBooking.status}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider mb-2 block">
            Required Documents Checklist
          </p>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {activeChecklistItems.length === 0 ? (
              <div className="text-center p-4 border border-dashed border-neutral-200 rounded-xl text-neutral-400 text-xs font-bold">
                No requirements configured for this facility type.
              </div>
            ) : (
              activeChecklistItems.map((item) => (
                <label 
                  key={item.check_id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    item.is_checked ? 'bg-green-50/50 border-green-200' : 'bg-white border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={item.is_checked} 
                      onChange={() => handleToggleChecklistItem(item.check_id, item.is_checked)}
                      className="w-5 h-5 appearance-none border-2 border-neutral-300 rounded-md checked:border-green-600 checked:bg-green-600 transition-colors cursor-pointer"
                    />
                    {item.is_checked && <span className="absolute text-white pointer-events-none">✓</span>}
                  </div>
                  <span className={`text-xs font-bold ${item.is_checked ? 'text-green-800 line-through opacity-70' : 'text-neutral-700'}`}>
                    {item.item_name}
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100">
            <button 
              type="button" 
              onClick={() => setShowActiveChecklistModal(false)} 
              className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white font-bold rounded-xl shadow-xs uppercase tracking-wide text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}