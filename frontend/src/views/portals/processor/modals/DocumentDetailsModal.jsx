import React from 'react';
import { X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function DocumentDetailsModal({
  setShowDetailsModal,
  selectedDoc,
  getRouteStopsArray
}) {
  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden flex flex-col text-left">
        <div className="p-4 border-b bg-[#FDFBF9] flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 text-sm">Document Tracking Details</h3>
          <button onClick={() => setShowDetailsModal(false)} className="text-neutral-400 hover:text-neutral-600"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-3 flex-1">
              <div>
                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Document Title</span>
                <h4 className="text-base font-black text-neutral-900 leading-tight">{selectedDoc.title}</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-[9px] font-bold text-neutral-400 uppercase block">Reference ID</span><p className="font-mono font-bold text-red-800">{selectedDoc.qr_code}</p></div>
                <div><span className="text-[9px] font-bold text-neutral-400 uppercase block">Form Type</span><p className="font-bold text-neutral-700">{selectedDoc.process_name}</p></div>
              </div>
              <div>
                <span className="text-[9px] font-bold text-neutral-400 uppercase block">Current Status</span>
                <span className="px-2.5 py-0.5 mt-1 bg-red-50 text-red-800 border rounded-full font-black text-[9px] uppercase tracking-wider inline-block">{selectedDoc.status || 'Active Path'}</span>
              </div>
            </div>
            <div className="bg-neutral-50 p-2 border rounded-xl text-center flex-shrink-0">
              <QRCodeSVG 
                value={selectedDoc.qr_code} 
                size={70} 
                level={"M"} 
                fgColor={"#262626"} 
              />
            </div>
          </div>
          <div className="pt-4 border-t text-left">
            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block mb-4">Submission Route Status</span>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-[5px] top-1 bottom-1 w-0.5 bg-neutral-200"></div>
              {getRouteStopsArray(selectedDoc).map((stop, i) => {
                const isCurrent = stop === selectedDoc.current_office;
                return (
                  <div key={i} className="relative flex flex-col">
                    <div className={`absolute -left-[24px] top-0.5 w-3 h-3 rounded-full border-2 bg-white ${isCurrent ? 'border-red-700 bg-red-700 ring-4 ring-red-100' : 'border-neutral-300'}`} />
                    <p className={`text-xs font-bold ${isCurrent ? 'text-red-800' : 'text-neutral-700'}`}>{stop}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-4 border-t bg-neutral-50/50 flex justify-end gap-2">
          <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-500 hover:bg-neutral-100">Close</button>
        </div>
      </div>
    </div>
  );
}