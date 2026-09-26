import React from 'react';
import { X, FileText, GitBranch, Camera, MessageSquare } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function DocumentAuditModal({
  showDetailsModal,
  setShowDetailsModal,
  selectedDoc,
  isHistoryDetails,
  isAwaitingScanIn,
  isInVerification,
  isActionAltered,
  showAdHocForm,
  setShowAdHocForm,
  showSendBackForm,
  setShowSendBackForm,
  selectedAdHocOffice,
  setSelectedAdHocOffice,
  officesList,
  gsoOfficeId,
  isActionProcessing,
  returnReason,
  setReturnReason,
  handleExecuteAdHocDetour,
  handleExecuteReturn,
  handleSignDocument,
  setScanMode,
  setShowScannerModal,
  setSimulatedQrPayload,
  handleNavigateToChat
}) {
  if (!showDetailsModal || !selectedDoc) return null;

  const docTitle = selectedDoc.title || 'N/A';
  const docProcess = selectedDoc.process_name || 'Administrative Request';
  const docStatus = selectedDoc.status || 'Active Path';
  const docQr = selectedDoc.qr_code || 'N/A';
  const docOrigin = selectedDoc.originating_office || selectedDoc.origin || 'University Unit';
  const requestorName = selectedDoc.requestor_name || 'N/A';
  const nextOffice = selectedDoc.next_office || 'End of Route / Finished';

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#180e10] w-full max-w-3xl rounded-2xl shadow-2xl border border-neutral-200 dark:border-[#42292f] overflow-hidden flex flex-col text-left">
        
        <div className="p-4 bg-[#FDFBF9] dark:bg-[#1c1113] border-b border-neutral-200 dark:border-[#42292f] font-bold text-sm flex items-center justify-between text-neutral-900 dark:text-white">
          <div className="flex items-center gap-2"><FileText size={16} className="text-red-700 dark:text-red-400"/> Document Audit Verification</div>
          <button onClick={() => setShowDetailsModal(false)} className="hover:bg-neutral-200 dark:hover:bg-gray-800 p-1 rounded-md cursor-pointer text-neutral-400 dark:text-gray-400 hover:text-neutral-600 dark:hover:text-gray-200"><X size={16} /></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="md:col-span-2 space-y-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-gray-500">Document Title</span>
              <h4 className="text-xl font-black text-neutral-900 dark:text-white leading-tight mt-1">{docTitle}</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-b border-neutral-100 dark:border-[#42292f] pb-4">
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-gray-500 block">Form Type</span>
                <p className="font-bold text-neutral-700 dark:text-gray-300 text-xs mt-1">{docProcess}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-gray-500 block">Current Status</span>
                <span className="px-2.5 py-0.5 bg-neutral-100 dark:bg-gray-800 border border-neutral-200 dark:border-gray-700 text-neutral-800 dark:text-gray-200 rounded font-black text-[9px] uppercase mt-1 inline-block">{docStatus}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-gray-500 block">Originating Office</span>
                <p className="font-bold text-neutral-700 dark:text-gray-300 mt-1 text-xs">{docOrigin}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-gray-500 block">Requestor Name</span>
                <p className="font-bold text-neutral-950 dark:text-white mt-1 text-xs">{requestorName}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-gray-500 block">Time In Arrival</span>
                <p className="font-mono text-xs font-bold mt-1 text-neutral-600 dark:text-gray-300">
                  {selectedDoc.time_in ? new Date(selectedDoc.time_in).toLocaleTimeString('en-US', {timeZone:'Asia/Manila'}) : <span className="text-blue-600 dark:text-blue-400">Awaiting Scan-In</span>}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-gray-500 block">Time Out Departure</span>
                <p className="font-mono text-xs font-bold mt-1 text-neutral-600 dark:text-gray-300">
                  {selectedDoc.time_out ? new Date(selectedDoc.time_out).toLocaleTimeString('en-US', {timeZone:'Asia/Manila'}) : <span className="text-amber-600 dark:text-amber-400">Still at GSO Station</span>}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-gray-500 block">Next Office Stop</span>
                <p className="font-bold text-red-800 dark:text-red-400 mt-1 text-xs">🏢 {nextOffice}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase text-neutral-400 dark:text-gray-500 block flex items-center gap-1">
                  Est. Completion (EDC) 
                  <span className="text-[8px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-black px-1 rounded">ML Placeholder</span>
                </span>
                <p className="font-bold text-purple-800 dark:text-purple-300 mt-1 text-xs">
                  🕒 {selectedDoc.edc ? new Date(selectedDoc.edc).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) : 'Calculating (Awaiting ML Inference...)'}
                </p>
              </div>
            </div>

            {isHistoryDetails || selectedDoc.time_out ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-xl p-4 flex gap-3.5 items-start">
                <span className="text-xl mt-0.5">ℹ️</span>
                <div className="text-xs text-left">
                  <p className="font-black text-blue-900 dark:text-blue-300 uppercase tracking-wide">Vault History View Only</p>
                  <p className="text-blue-700 dark:text-blue-400 font-medium mt-1 leading-normal">
                    This document step has been locked into the history vault. Active signatures or workflow re-routing permissions are disabled.
                  </p>
                </div>
              </div>
            ) : isAwaitingScanIn ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-xl p-4 flex gap-3 text-sm">
                <span>🛑</span>
                <div>
                  <p className="font-black text-blue-900 dark:text-blue-300 uppercase text-[10px] tracking-wide">Action Required: Scan-In Needed</p>
                  <p className="text-blue-700 dark:text-blue-400 font-medium text-xs mt-1">This document must be officially Scanned-In to GSO custody before any authorization logic can be applied.</p>
                </div>
              </div>
            ) : isInVerification ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl p-4 flex gap-3 text-sm">
                <span>⚖️</span>
                <div>
                  <p className="font-black text-red-900 dark:text-red-300 uppercase text-[10px] tracking-wide">In Verification Checkpoint</p>
                  <p className="text-red-700 dark:text-red-400 font-medium text-xs mt-1">This request is routing through an ad-hoc detour branch. Actions suspended until returned.</p>
                </div>
              </div>
            ) : isActionAltered ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-xl p-4 flex gap-3 text-sm">
                <span>🛡️</span>
                <div>
                  <p className="font-black text-green-900 dark:text-green-300 uppercase text-[10px] tracking-wide">Vault Locked</p>
                  <p className="text-green-700 dark:text-green-400 font-medium text-xs mt-1">Action completed. Ready for Time-Out scan to push to next destination.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setShowAdHocForm(!showAdHocForm); setShowSendBackForm(false); }} 
                    className="px-4 py-2 bg-neutral-100 dark:bg-gray-800 hover:bg-neutral-200 dark:hover:bg-gray-700 text-neutral-700 dark:text-gray-300 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <GitBranch size={14} /> Ad-hoc Detour
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => handleNavigateToChat && handleNavigateToChat(selectedDoc)} 
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <MessageSquare size={14} /> Chat with this file
                  </button>
                </div>

                {showAdHocForm && (
                  <form onSubmit={handleExecuteAdHocDetour} className="bg-neutral-50 dark:bg-[#1c1113] p-4 border border-neutral-200 dark:border-gray-700 rounded-xl space-y-3">
                    <select required value={selectedAdHocOffice} onChange={e => setSelectedAdHocOffice(e.target.value)} className="w-full bg-white dark:bg-[#180e10] text-neutral-900 dark:text-white border border-neutral-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-bold cursor-pointer outline-none">
                      <option value="">-- Choose Detour Target --</option>
                      {officesList.map((off, idx) => (off.id !== gsoOfficeId && <option key={idx} value={off.id}>{off.name}</option>))}
                    </select>
                    <button type="submit" disabled={isActionProcessing} className="w-full py-2 bg-neutral-800 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white font-bold text-xs rounded-lg uppercase cursor-pointer">Route Detour</button>
                  </form>
                )}

                {showSendBackForm && (
                  <form onSubmit={handleExecuteReturn} className="bg-red-50/40 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-xl p-4 space-y-3">
                    <textarea required rows={3} placeholder="Provide revision notes..." value={returnReason} onChange={e => setReturnReason(e.target.value)} className="w-full border border-red-200 dark:border-red-900 bg-white dark:bg-[#180e10] rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-red-800 font-medium text-neutral-800 dark:text-white" />
                    <button type="submit" disabled={isActionProcessing} className="w-full py-2 bg-red-800 dark:bg-red-700 hover:bg-red-900 dark:hover:bg-red-800 text-white font-bold text-xs rounded-lg uppercase tracking-wide cursor-pointer">Submit Revision Request</button>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="border-l border-neutral-200 dark:border-[#42292f] pl-6 space-y-6 flex flex-col items-center">
            <div className="text-center w-full">
              <span className="text-[9px] font-black uppercase text-neutral-400 dark:text-gray-500 tracking-wider">Identity Token</span>
              <div className="bg-white dark:bg-[#180e10] p-3 border border-neutral-200 dark:border-gray-700 rounded-xl shadow-xs inline-block mt-2">
                <QRCodeSVG value={docQr} size={120} level={"M"} fgColor={"#2D1F1E"} />
              </div>
              <span className="font-mono text-[10px] font-black text-red-800 dark:text-red-400 tracking-wide mt-2 block break-all">{docQr}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-200 dark:border-[#42292f] bg-[#FDFBF9] dark:bg-[#1c1113] flex justify-end gap-2 px-6">
          {!isAwaitingScanIn && !isInVerification && !isActionAltered && !isHistoryDetails && (
            <>
              <button type="button" onClick={() => { setShowSendBackForm(!showSendBackForm); setShowAdHocForm(false); }} className="px-5 py-2 border border-neutral-300 dark:border-gray-700 bg-white dark:bg-[#180e10] hover:bg-neutral-50 dark:hover:bg-gray-800 rounded-xl font-bold text-xs text-neutral-600 dark:text-gray-300 transition-all cursor-pointer">{showSendBackForm ? 'Cancel Revision' : 'Send Back'}</button>
              <button type="button" disabled={isActionProcessing} onClick={handleSignDocument} className="px-6 py-2 bg-red-800 dark:bg-red-700 hover:bg-red-900 dark:hover:bg-red-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider shadow-md cursor-pointer">Sign File</button>
            </>
          )}
          {isAwaitingScanIn && (
            <button type="button" onClick={() => { setShowDetailsModal(false); setScanMode('time-in'); setShowScannerModal(true); setSimulatedQrPayload(docQr); }} className="px-6 py-2 bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md uppercase tracking-wider flex items-center gap-2 cursor-pointer"><Camera size={14}/> Scan-In Now</button>
          )}
          {isActionAltered && !selectedDoc.time_out && (
            <button type="button" onClick={() => { setShowDetailsModal(false); setScanMode('time-out'); setShowScannerModal(true); setSimulatedQrPayload(docQr); }} className="px-6 py-2 bg-green-700 dark:bg-green-600 hover:bg-green-800 dark:hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md uppercase tracking-wider flex items-center gap-2 cursor-pointer"><Camera size={14}/> Scan-Out Now</button>
          )}
        </div>
      </div>
    </div>
  );
}