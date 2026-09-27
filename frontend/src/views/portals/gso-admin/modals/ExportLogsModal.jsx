import React from 'react';
import { X, Download } from 'lucide-react';

export default function ExportLogsModal({
  showPrintModal,
  setShowPrintModal,
  printTargetTab,
  setPrintTargetTab,
  printStartDate,
  setPrintStartDate,
  printEndDate,
  setPrintEndDate,
  handleGeneratePDF
}) {
  if (!showPrintModal) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#180e10] w-full max-w-lg rounded-2xl shadow-2xl border border-neutral-200 dark:border-[#42292f] overflow-hidden flex flex-col text-left">
        
        <div className="p-4 border-b border-neutral-200 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-2">
            <Download className="text-neutral-700 dark:text-gray-300" size={16} /> Download Request Records
          </h3>
          <button onClick={() => setShowPrintModal(false)} className="text-neutral-400 dark:text-gray-400 hover:text-neutral-600 dark:hover:text-gray-200 cursor-pointer"><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col space-y-4">
          <label className="block text-[10px] font-black uppercase text-neutral-400 dark:text-gray-500 tracking-wider">Select Target Database</label>
          
          <div className="bg-neutral-100 dark:bg-[#1c1113] p-1 rounded-xl flex font-bold text-[10px] flex-wrap border border-neutral-200 dark:border-gray-800">
            {['Vehicles', 'Multimedia Room', 'Gymnasium', 'Supplies & Equipment'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setPrintTargetTab(tab)}
                className={`flex-1 py-2 rounded-lg uppercase tracking-wider transition-colors min-w-[45%] m-0.5 cursor-pointer ${
                  printTargetTab === tab 
                    ? 'bg-white dark:bg-[#180e10] text-neutral-900 dark:text-white shadow-sm border border-neutral-200 dark:border-gray-700' 
                    : 'text-neutral-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Start Date</label>
              <input 
                type="date" 
                value={printStartDate}
                onChange={(e) => setPrintStartDate(e.target.value)}
                className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-neutral-700 dark:focus:ring-gray-500 outline-none bg-neutral-50 dark:bg-[#1c1113] text-neutral-900 dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">End Date</label>
              <input 
                type="date" 
                value={printEndDate}
                onChange={(e) => setPrintEndDate(e.target.value)}
                className="w-full px-4 py-2 text-xs border border-neutral-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-neutral-700 dark:focus:ring-gray-500 outline-none bg-neutral-50 dark:bg-[#1c1113] text-neutral-900 dark:text-white" 
              />
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-6 border-t border-neutral-100 dark:border-[#42292f] mt-6">
            <button type="button" onClick={() => setShowPrintModal(false)} className="w-1/2 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#180e10] rounded-xl font-bold text-xs text-gray-500 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-gray-800 uppercase tracking-wide cursor-pointer">Cancel</button>
            <button 
              type="button" 
              onClick={handleGeneratePDF}
              className="w-1/2 py-2.5 bg-neutral-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white font-bold rounded-xl shadow-xs uppercase tracking-wide text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={14} /> Generate PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}