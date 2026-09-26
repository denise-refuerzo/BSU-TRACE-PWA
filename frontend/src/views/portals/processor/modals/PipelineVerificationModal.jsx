import React from 'react';
import { X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function PipelineVerificationModal({
  setShowPipelineModal,
  selectedDoc,
  isHistoryDetails,
  getRouteStopsArray,
  handleExecuteAdHocDetour,
  selectedAdHocOffice,
  setSelectedAdHocOffice,
  officesList,
  processorOfficeId,
  isAdHocProcessing
}) {
  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#180e10] w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-[#42292f] overflow-hidden flex flex-col text-left">
        <div className="p-5 border-b border-gray-100 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 dark:text-white text-sm">Document Verification Detail</h3>
          <button onClick={() => setShowPipelineModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-gray-200"><X size={16} /></button>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <div className="space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Reference Number</span>
                <h4 className="text-sm font-black text-red-800 dark:text-red-400 font-mono tracking-wide mt-0.5">{selectedDoc.qr_code}</h4>
              </div>
              <div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Date Created</span>
                <p className="text-xs font-black text-neutral-800 dark:text-gray-200 mt-0.5">
                  {selectedDoc.created_at ? new Date(selectedDoc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </p>
              </div>

              <div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Subject</span>
                <p className="text-xs font-bold text-neutral-700 dark:text-gray-300 leading-normal mt-0.5">{selectedDoc.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs border-t border-b border-neutral-100 dark:border-[#42292f] py-3">
                <div>
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Origin Office </span>
                  <p className="font-bold text-neutral-800 dark:text-gray-200 mt-0.5">{selectedDoc.originating_office || selectedDoc.origin || 'This is the First Office'}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Target Delivery</span>
                  <p className="font-bold text-neutral-500 dark:text-gray-400 mt-0.5">
                    {selectedDoc.edc ? new Date(selectedDoc.edc).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Time-In Arrival</span>
                  <p className="font-mono text-[11px] font-bold mt-0.5 text-neutral-700 dark:text-gray-300">
                    {selectedDoc.time_in ? (
                      new Date(selectedDoc.time_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    ) : (
                      <span className="text-red-600 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide uppercase">Awaiting Scan</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Time-Out Release</span>
                  <p className="font-mono text-[11px] font-bold mt-0.5 text-neutral-700 dark:text-gray-300">
                    {selectedDoc.time_out ? (
                      new Date(selectedDoc.time_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    ) : (
                      <span className="text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide uppercase">In Progress</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900 p-4 rounded-2xl">
              <span className="text-[9px] font-black text-red-800 dark:text-red-400 uppercase tracking-wider block mb-3">📋 Routing Status</span>
              <div className="flex items-center justify-between text-[10px] font-black text-neutral-600 dark:text-gray-400 relative px-1">
                {getRouteStopsArray(selectedDoc).slice(0, 4).map((stop, i) => {
                  const isCurrent = stop === selectedDoc.current_office;
                  return (
                    <div key={i} className="flex flex-col items-center relative z-10">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 font-mono text-[9px] ${
                        isCurrent ? 'bg-red-700 text-white border-red-700 ring-4 ring-red-100 dark:ring-red-900' : 'bg-white dark:bg-[#1c1113] text-neutral-400 border-neutral-300 dark:border-gray-700'
                      }`}>
                        {i + 1}
                      </div>
                      <span className={`text-[8px] mt-1 tracking-tight max-w-[50px] text-center truncate font-bold ${isCurrent ? 'text-red-800 dark:text-red-400 font-black' : 'text-neutral-400'}`}>
                        {stop.replace('Office', '').trim()}
                      </span>
                    </div>
                  );
                })}
                <div className="absolute left-4 right-4 top-2.5 h-0.5 bg-neutral-200 dark:bg-gray-700 -z-10"></div>
              </div>
            </div>
          </div>

          <div className="border border-neutral-200 dark:border-[#42292f] rounded-2xl p-5 bg-neutral-50/50 dark:bg-[#1c1113] flex flex-col justify-between items-center text-center">
            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Security QR Identity</span>
            <div className="bg-white dark:bg-[#180e10] p-4 border border-neutral-200 dark:border-gray-700 rounded-2xl shadow-xs my-3">
              <QRCodeSVG 
                value={selectedDoc.qr_code} 
                size={110} 
                level={"H"} 
                fgColor={"#7f1d1d"} 
              />
            </div>
            <p className="text-[10px] text-neutral-400 leading-normal max-w-[180px] font-medium">Scan to verify authenticity on any authorized workstation.</p>            

            {isHistoryDetails || selectedDoc.time_out ? (
              <div className="w-full mt-4 border-t border-dashed border-neutral-200 dark:border-gray-700 pt-4 text-center">
                <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl p-3 uppercase tracking-wide">
                  ℹ️ Vault History View: Read-only ledger context. Actions locked out cleanly.
                </p>
              </div>
            ) : selectedDoc.status?.toLowerCase() === 'in verification' || selectedDoc.current_step_is_adhoc || selectedDoc.is_adhoc ? (
              <div className="w-full mt-4 border-t border-dashed border-neutral-200 dark:border-gray-700 pt-4 text-center">
                <p className="text-[10px] font-black text-purple-700 dark:text-purple-400 bg-purple-50/80 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900 rounded-xl p-3 uppercase tracking-wide">
                  ⚖️ Ad-Hoc Active: This file is currently undergoing an active ad-hoc detour route step and is currently out of your hands.
                </p>
              </div>
            ) : selectedDoc.time_in ? (
              <form onSubmit={handleExecuteAdHocDetour} className="w-full mt-4 border-t border-dashed border-neutral-200 dark:border-gray-700 pt-4 space-y-2 text-left">
                <label className="block text-[9px] font-black text-neutral-400 uppercase tracking-wider">
                  Request Ad-hoc Verification Detour
                </label>
                <div className="flex flex-col gap-2">
                  <select 
                    required 
                    value={selectedAdHocOffice} 
                    onChange={e => setSelectedAdHocOffice(e.target.value)}
                    className="w-full bg-white dark:bg-[#180e10] border border-neutral-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-red-700 font-bold text-neutral-700 dark:text-gray-200 cursor-pointer"
                  >
                    <option value="">-- Select Destination Office --</option>
                    {officesList.map((off, idx) => (
                      off.id !== processorOfficeId && <option key={idx} value={off.id}>{off.name}</option>
                    ))}
                  </select>
                  
                  <button 
                    type="submit" 
                    disabled={isAdHocProcessing}
                    className="w-full py-2.5 bg-red-800 dark:bg-red-700 hover:bg-red-900 dark:hover:bg-red-800 disabled:bg-neutral-400 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wider shadow-xs cursor-pointer"
                  >
                    {isAdHocProcessing ? 'Processing Detour...' : '🛡️ Route Ad-hoc Verification'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="w-full mt-4 border-t border-dashed border-neutral-200 dark:border-gray-700 pt-4 text-center">
                <p className="text-[10px] font-black text-red-700 dark:text-red-400 bg-red-50/70 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-xl p-3 uppercase tracking-wide">
                  🛑 Ad-Hoc Detour Unavailable: Document must be scanned for Time-In at your office first.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-[#42292f] bg-neutral-50/50 dark:bg-[#1c1113] flex justify-end">
          <button onClick={() => setShowPipelineModal(false)} className="px-5 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
}