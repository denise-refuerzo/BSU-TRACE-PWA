import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function ViewTrackingQrModal({ selectedDoc, setShowQrOverlay }) {
  return (
    <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full border shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-800 flex items-center justify-center mx-auto text-xl">📋</div>
        <div>
          <h3 className="text-base font-bold text-neutral-900">{selectedDoc.title}</h3>
          <p className="text-xs text-neutral-400 mt-1">Scan this token code to capture current tracking coordinates.</p>
        </div>
        <div className="bg-neutral-50 p-6 border rounded-xl flex flex-col items-center justify-center border-dashed">
          <QRCodeSVG 
            value={selectedDoc.qr_code} 
            size={160} 
            level={"H"}
            includeMargin={true}
            fgColor={"#171717"}
          />
          <code className="text-[10px] mt-3 font-mono bg-white px-2 py-0.5 border rounded text-neutral-600 tracking-wider font-bold">
            {selectedDoc.qr_code}
          </code>
        </div>
        <button onClick={() => setShowQrOverlay(false)} className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs rounded-lg transition-colors">
          Dismiss Viewer
        </button>
      </div>
    </div>
  );
}