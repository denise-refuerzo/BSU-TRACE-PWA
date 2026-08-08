import React from 'react';
import { X, GitBranch } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function DocumentDetailsModal({
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
  returnReason,
  setReturnReason,
  selectedAdHocOffice,
  setSelectedAdHocOffice,
  officesList,
  signeeOfficeId,
  isActionProcessing,
  handleSignDocument,
  handleExecuteReturn,
  handleExecuteAdHocDetour
}) {
  if (!showDetailsModal || !selectedDoc) return null;

  const docTitle = selectedDoc.title || selectedDoc.document_title || 'N/A';
  const docProcess = selectedDoc.process_name || 'Administrative Request';
  const docStatus = selectedDoc.status || 'Active Path';
  const docQr = selectedDoc.qr_code || 'N/A';
  const docOrigin = selectedDoc.originating_office || selectedDoc.origin || 'University Unit';
  const docNext = selectedDoc.next_office || 'None (Final Stop)';
  const docRequestor = selectedDoc.requestor_name || 'N/A';

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col text-left animate-in zoom-in-95 duration-200">
        
        <div className="p-4 bg-red-800 text-white font-bold text-sm flex items-center justify-between">
          <span>Document Routing Identification Verification</span>
          <button onClick={() => setShowDetailsModal(false)} className="hover:opacity-80">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Document Title</span>
                <p className="text-lg font-black text-neutral-900 leading-tight tracking-tight">{docTitle}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-b border-neutral-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider block">Form Type</span>
                  <p className="font-bold text-neutral-700 text-xs mt-1">{docProcess}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-neutral-400 tracking-wide block">Current Status</span>
                  <span className="px-2.5 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded font-black text-[9px] uppercase tracking-wider inline-block mt-1">
                    {docStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-b pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide block">Originating Office</span>
                  <p className="font-bold text-neutral-700 mt-1">{docOrigin}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide block">Date Created</span>
                  <p className="font-bold text-neutral-700 mt-1">
                    {selectedDoc.created_at ? new Date(selectedDoc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide block">Next Office Stop</span>
                  <p className="font-bold text-neutral-700 mt-1">{docNext}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide block">Requestor</span>
                  <p className="font-black text-neutral-800 mt-1 truncate">{docRequestor}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide block">Time In Arrival</span>
                  <p className="font-mono text-[11px] font-bold mt-1 text-neutral-600">
                  {selectedDoc.time_in ? (
                    new Date(selectedDoc.time_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  ) : (
                      <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Awaiting Scan</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wide block">Time Out Release</span>
                  <p className="font-mono text-[11px] font-bold mt-0.5 text-neutral-600">
                  {selectedDoc.time_out ? (
                    new Date(selectedDoc.time_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  ) : (
                    <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide uppercase">In Progress</span>
                  )}                        </p>
                </div>
              </div>
            </div>
            <div className="border border-neutral-200/80 p-5 rounded-xl bg-white flex flex-col items-center justify-center text-center shadow-xs">
              <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wide mb-3">Security QR Identity Token</span>
              <div className="bg-white p-3 border border-neutral-200 rounded-xl shadow-xs">
                <QRCodeSVG 
                  value={docQr} 
                  size={115} 
                  level={"H"} 
                  fgColor={"#171717"} 
                />
              </div>
              <div className="mt-4 text-center">
                <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">Tracking Reference Number</span>
                <span className="font-mono text-xs font-black text-red-800 tracking-wide mt-1 block">{docQr}</span>
              </div>
            </div>
          </div>

          {isHistoryDetails || selectedDoc.time_out ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3.5 items-start">
              <span className="text-xl mt-0.5">ℹ️</span>
              <div className="text-xs text-left">
                <p className="font-black text-blue-900 uppercase tracking-wide">Vault History View Only</p>
                <p className="text-blue-700 font-medium mt-1 leading-normal">
                  This document step has been locked into the history vault. Active signatures or workflow re-routing permissions are disabled.
                </p>
              </div>
            </div>
          ) : isAwaitingScanIn ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3.5 items-start animate-in fade-in duration-150">
              <span className="text-xl mt-0.5">🛑</span>
              <div className="text-xs text-left">
                <p className="font-black text-red-900 uppercase tracking-wide">Processing Unavailable: Not yet Scanned in</p>
                <p className="text-red-700 font-medium mt-1 leading-normal">
                  This administrative document cannot be signed or sent back yet. The office Processor must physically scan the file barcode tracking token to confirm its official safe arrival inside your department workspace branch first.
                </p>
              </div>
            </div>
          ) : isInVerification ? (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex gap-3.5 items-start animate-in fade-in duration-100">
              <span className="text-xl mt-0.5">⚖️</span>
              <div className="text-xs text-left">
                <p className="font-black text-amber-900 uppercase tracking-wide">Document In Verification Checkpoint</p>
                <p className="text-amber-700 font-medium mt-1 leading-normal">
                  This administrative request is currently routing through an active external ad-hoc detour verification branch step. Action workflow options are suspended until it completes its path loop back to your campus terminal office sector.
                </p>
              </div>
            </div>
          ) : isActionAltered ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3.5 items-start">
              <span className="text-xl mt-0.5">🛡️</span>
              <div className="text-xs text-left">
                <p className="font-black text-green-900 uppercase tracking-wide">Action Completed Securely</p>
                <p className="text-green-700 font-medium mt-1 leading-normal">
                  Your official action signature seal has been submitted successfully for this station. Double modifications are restricted. Processors can now complete the Time-Out clearance sequence.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 border-t pt-4">
              <div className="flex flex-wrap gap-2">
                <button 
                  type="button" 
                  onClick={() => { setShowAdHocForm(!showAdHocForm); setShowSendBackForm(false); }} 
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-900 rounded-xl font-bold text-xs flex items-center gap-2 border border-red-100 transition-all"
                >
                  <GitBranch size={14} /> Request Ad-hoc Detour
                </button>
              </div>

              {showAdHocForm && (
                <form onSubmit={handleExecuteAdHocDetour} className="bg-neutral-50 p-4 border rounded-xl space-y-3 animate-in slide-in-from-top-1 duration-150">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400">Select Verification Destination Campus Unit</label>
                  <div className="flex gap-2">
                    <select required value={selectedAdHocOffice} onChange={e => setSelectedAdHocOffice(e.target.value)} className="flex-1 bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs font-bold text-neutral-700">
                      <option value="">-- Choose Destination Branch --</option>
                      {officesList.map((off, idx) => (off.id !== signeeOfficeId && <option key={idx} value={off.id}>{off.name}</option>))}
                    </select>
                    <button type="submit" disabled={isActionProcessing} className="px-5 py-1.5 bg-red-800 text-white font-bold text-xs rounded-lg uppercase tracking-wider shadow-sm">Route Detour</button>
                  </div>
                </form>
              )}

              {showSendBackForm && (
                <form onSubmit={handleExecuteReturn} className="bg-red-50/40 border border-red-100 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-red-900 uppercase tracking-wider">Reason for Return (Revision Notes Required)</label>
                    <textarea required rows={3} placeholder="Enter specific reason detailing why this documentation is being sent back to the originator for modifications..." value={returnReason} onChange={e => setReturnReason(e.target.value)} className="w-full border bg-white rounded-lg p-3 text-xs outline-none focus:ring-1 focus:ring-red-800 font-medium text-neutral-800" />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={isActionProcessing} className="px-5 py-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-lg uppercase tracking-wide shadow-md">Submit & Return to Originator</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-neutral-50/80 flex justify-end gap-2 px-6">
          <button 
            type="button" 
            onClick={() => { setShowSendBackForm(!showSendBackForm); setShowAdHocForm(false); }} 
            disabled={isHistoryDetails || isInVerification || isAwaitingScanIn || isActionAltered || selectedDoc.time_out}
            className="px-5 py-2 border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-30 rounded-xl font-bold text-xs text-neutral-600 shadow-xs transition-all"
          >
            {showSendBackForm ? 'Cancel Revision' : 'Send Back'}
          </button>
          <button 
            type="button" 
            disabled={isActionProcessing || isHistoryDetails || isActionAltered || isInVerification || isAwaitingScanIn || selectedDoc.time_out} 
            onClick={handleSignDocument} 
            className="px-6 py-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs rounded-xl shadow-md uppercase tracking-wider transition-all disabled:opacity-30"
          >
            Sign File
          </button>
        </div>
      </div>
    </div>
  );
}