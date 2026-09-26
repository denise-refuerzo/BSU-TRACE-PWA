import React from 'react';
import { X, Edit, Trash2 } from 'lucide-react';

export default function MasterChecklistModal({
  showChecklistMakerModal,
  setShowChecklistMakerModal,
  activeChecklistTab,
  setActiveChecklistTab,
  masterChecklistItems,
  handleDeleteMasterChecklistItem,
  handleAddMasterChecklistItem,
  newChecklistName,
  setNewChecklistName
}) {
  if (!showChecklistMakerModal) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#180e10] w-full max-w-lg rounded-2xl shadow-2xl border border-neutral-200 dark:border-[#42292f] overflow-hidden flex flex-col text-left">
        
        <div className="p-4 border-b border-neutral-200 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-2">
            <Edit className="text-red-800 dark:text-red-400" size={16} />Document Checklist Settings
          </h3>
          <button onClick={() => setShowChecklistMakerModal(false)} className="text-neutral-400 dark:text-gray-400 hover:text-neutral-600 dark:hover:text-gray-200 cursor-pointer"><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col h-[50vh]">
          {/* Reservation Target Tabs */}
          <div className="bg-neutral-100 dark:bg-[#1c1113] p-1 rounded-xl flex font-bold text-[10px] mb-4 flex-shrink-0 border border-neutral-200 dark:border-gray-800">
            {['Vehicle', 'Multimedia Room', 'Gymnasium'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveChecklistTab(tab)}
                className={`w-1/3 py-2 rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${
                  activeChecklistTab === tab ? 'bg-white dark:bg-[#2b1317] text-red-800 dark:text-red-400 shadow-sm' : 'text-neutral-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Global List Editor */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 border border-neutral-200 dark:border-gray-700 bg-neutral-50 dark:bg-[#1c1113] rounded-xl p-4">
            <p className="text-[10px] font-black uppercase text-neutral-400 dark:text-gray-500 tracking-wider mb-3 block">
              {activeChecklistTab} Required Attachments
            </p>
            
            {masterChecklistItems.length === 0 ? (
              <div className="text-center p-4 text-neutral-400 dark:text-gray-500 text-xs font-bold">No requirements set.</div>
            ) : (
              masterChecklistItems.map(item => (
                <div key={item.template_id} className="flex justify-between items-center bg-white dark:bg-[#180e10] p-2.5 rounded-lg border border-neutral-200 dark:border-gray-700 shadow-sm animate-in fade-in">
                  <span className="text-xs font-bold text-neutral-700 dark:text-gray-200">{item.item_name}</span>
                  <button 
                    onClick={() => handleDeleteMasterChecklistItem(item.template_id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add New Item Input */}
          <form onSubmit={handleAddMasterChecklistItem} className="mt-4 flex gap-2 flex-shrink-0">
            <input 
              type="text" 
              value={newChecklistName}
              onChange={(e) => setNewChecklistName(e.target.value)}
              placeholder="Enter required document name..." 
              className="flex-1 px-3 py-2 text-xs border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#1c1113] text-neutral-900 dark:text-white rounded-lg focus:ring-1 focus:ring-red-700 outline-none"
            />
            <button 
              type="submit" 
              className="px-4 py-2 bg-neutral-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white font-bold text-xs rounded-lg uppercase tracking-wide transition-colors cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}