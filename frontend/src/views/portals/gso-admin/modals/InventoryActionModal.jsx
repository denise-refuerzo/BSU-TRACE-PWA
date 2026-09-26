import React from 'react';
import { X } from 'lucide-react';

export default function InventoryActionModal({
  showInventoryModal,
  setShowInventoryModal,
  selectedInventoryItem,
  inventoryModalMode,
  setInventoryModalMode,
  handleInventorySubmit,
  inventoryForm,
  setInventoryForm,
  todayString,
  isActionProcessing
}) {
  if (!showInventoryModal || !selectedInventoryItem) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#180e10] w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 dark:border-[#42292f] overflow-hidden flex flex-col text-left">
        
        <div className="flex border-b border-neutral-200 dark:border-[#42292f]">
          <button 
            onClick={() => setInventoryModalMode('LEND')}
            className={`w-1/2 py-4 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${inventoryModalMode === 'LEND' ? 'text-red-800 dark:text-red-400 border-b-2 border-red-800 dark:border-red-500 bg-white dark:bg-[#180e10]' : 'text-neutral-400 bg-neutral-50 dark:bg-[#1c1113] hover:bg-neutral-100 dark:hover:bg-gray-800'}`}
          >
            Lending Form
          </button>
          <button 
            onClick={() => setInventoryModalMode('RETURN')}
            className={`w-1/2 py-4 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${inventoryModalMode === 'RETURN' ? 'text-red-800 dark:text-red-400 border-b-2 border-red-800 dark:border-red-500 bg-white dark:bg-[#180e10]' : 'text-neutral-400 bg-neutral-50 dark:bg-[#1c1113] hover:bg-neutral-100 dark:hover:bg-gray-800'}`}
          >
            Return Form
          </button>
        </div>
        
        <form onSubmit={handleInventorySubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="bg-red-50/50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900 mb-2">
            <span className="text-[10px] text-red-800 dark:text-red-400 font-bold uppercase block">Target Asset</span>
            <span className="font-black text-neutral-900 dark:text-white text-sm">{selectedInventoryItem.asset_name}</span>
          </div>

          {inventoryModalMode === 'LEND' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Requestor</label>
                  <input type="text" required value={inventoryForm.requestorName} onChange={e => setInventoryForm({...inventoryForm, requestorName: e.target.value})} className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Department</label>
                  <input type="text" required value={inventoryForm.department} onChange={e => setInventoryForm({...inventoryForm, department: e.target.value})} className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Purpose</label>
                <input type="text" required value={inventoryForm.purpose} onChange={e => setInventoryForm({...inventoryForm, purpose: e.target.value})} className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Date</label>
                  <input 
                    type="date" 
                    required 
                    min={todayString} 
                    className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Duration (Hours)</label>
                  <input type="number" required value={inventoryForm.duration} onChange={e => setInventoryForm({...inventoryForm, duration: e.target.value})} className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Quantity Needed</label>
                <input type="number" required max={selectedInventoryItem.current_stock} min="1" value={inventoryForm.quantityNeeded} onChange={e => setInventoryForm({...inventoryForm, quantityNeeded: e.target.value})} className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" />
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Requestor (Matching Name)</label>
                <input type="text" required value={inventoryForm.requestorName} onChange={e => setInventoryForm({...inventoryForm, requestorName: e.target.value})} className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Return Date</label>
                  <input type="date" required value={inventoryForm.returnDate} onChange={e => setInventoryForm({...inventoryForm, returnDate: e.target.value})} className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Return Time</label>
                  <input type="time" required value={inventoryForm.returnTime} onChange={e => setInventoryForm({...inventoryForm, returnTime: e.target.value})} className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Quantity Returned</label>
                <input type="number" required min="1" value={inventoryForm.quantityNeeded} onChange={e => setInventoryForm({...inventoryForm, quantityNeeded: e.target.value})} className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-red-700" />
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-[#42292f]">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Item Condition Upon Return</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-gray-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="condition" 
                      checked={!inventoryForm.isDamaged} 
                      onChange={() => setInventoryForm({...inventoryForm, isDamaged: false, damageNotes: ''})} 
                      className="text-red-800 focus:ring-red-700 w-3.5 h-3.5 cursor-pointer" 
                    />
                    Good / No Damages
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-gray-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="condition" 
                      checked={inventoryForm.isDamaged} 
                      onChange={() => setInventoryForm({...inventoryForm, isDamaged: true})} 
                      className="text-red-800 focus:ring-red-700 w-3.5 h-3.5 cursor-pointer" 
                    />
                    Damaged
                  </label>
                </div>

                {inventoryForm.isDamaged && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Damage Assessment Notes</label>
                    <textarea
                      required
                      rows="2"
                      placeholder="Describe the damages found..."
                      value={inventoryForm.damageNotes}
                      onChange={e => setInventoryForm({...inventoryForm, damageNotes: e.target.value})}
                      className="w-full px-4 py-2 text-xs border border-red-300 dark:border-red-900 rounded-lg outline-none focus:ring-1 focus:ring-red-700 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300 placeholder:text-red-300 dark:placeholder:text-red-500 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between gap-3 pt-6 border-t border-neutral-100 dark:border-[#42292f] mt-2">
            <button type="button" onClick={() => setShowInventoryModal(false)} className="w-1/2 py-2.5 border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#180e10] rounded-xl font-bold text-xs text-gray-500 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-gray-800 uppercase tracking-wide cursor-pointer">Cancel</button>
            <button type="submit" disabled={isActionProcessing} className="w-1/2 py-2.5 bg-red-800 dark:bg-red-700 hover:bg-red-900 dark:hover:bg-red-800 text-white font-bold rounded-xl shadow-xs uppercase tracking-wide text-xs disabled:opacity-50 cursor-pointer">
              {inventoryModalMode === 'LEND' ? 'Submit' : 'Confirm Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}