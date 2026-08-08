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
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden flex flex-col text-left">
        
        <div className="p-4 border-b bg-[#FDFBF9] flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
            <Download size={16} className="text-neutral-700" /> Export Procurement Logs
          </h3>
          <button onClick={() => setShowPrintModal(false)} className="text-neutral-400 hover:text-neutral-600"><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col">
          <label className="block text-[10px] font-black uppercase text-neutral-400 tracking-wider mb-2">Select Target Database</label>
          
          <div className="bg-neutral-100 p-1 rounded-xl flex font-bold text-[10px] mb-4 flex-wrap">
            {['Vehicle', 'Multimedia Room', 'Gymnasium', 'Logistics History'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setPrintTargetTab(tab)}
                className={`flex-1 py-2 rounded-lg uppercase tracking-wider transition-colors min-w-[45%] m-0.5 ${
                  printTargetTab === tab ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Start Date</label>
              <input 
                type="date" 
                value={printStartDate}
                onChange={(e) => setPrintStartDate(e.target.value)}
                className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-lg focus:ring-1 focus:ring-neutral-700 outline-none bg-neutral-50" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">End Date</label>
              <input 
                type="date" 
                value={printEndDate}
                onChange={(e) => setPrintEndDate(e.target.value)}
                className="w-full px-4 py-2 text-xs border border-neutral-300 rounded-lg focus:ring-1 focus:ring-neutral-700 outline-none bg-neutral-50" 
              />
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-6 border-t border-neutral-100 mt-6">
            <button type="button" onClick={() => setShowPrintModal(false)} className="w-1/2 py-2.5 border rounded-xl font-bold text-xs text-gray-500 hover:bg-neutral-50 uppercase tracking-wide">Cancel</button>
            <button 
                type="button" 
                onClick={handleGeneratePDF}
                className="w-1/2 py-2.5 bg-neutral-900 hover:bg-black text-white font-bold rounded-xl shadow-xs uppercase tracking-wide text-xs flex items-center justify-center gap-2"
              >
                <Download size={14} /> Generate PDF
              </button>
          </div>
        </div>

      </div>
    </div>
  );
}