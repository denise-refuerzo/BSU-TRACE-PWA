import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function ViewTrackingQrModal({ selectedDoc, setShowQrOverlay }) {
  return (
    <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-white dark:bg-[#180e10] rounded-2xl p-6 text-center max-w-sm w-full border border-neutral-200 dark:border-[#42292f] shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 flex items-center justify-center mx-auto text-xl">📋</div>
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">{selectedDoc.title}</h3>
          <p className="text-xs text-neutral-400 dark:text-gray-400 mt-1">Scan this token code to capture current tracking coordinates.</p>
        </div>
        <div className="bg-neutral-50 dark:bg-[#1c1113] p-6 border border-neutral-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center border-dashed">
          <QRCodeSVG 
            value={selectedDoc.qr_code} 
            size={160} 
            level={"H"}
            includeMargin={true}
            fgColor={"#171717"}
          />
          <code className="text-[10px] mt-3 font-mono bg-white dark:bg-[#180e10] px-2 py-0.5 border border-neutral-200 dark:border-gray-700 rounded text-neutral-600 dark:text-gray-300 tracking-wider font-bold">
            {selectedDoc.qr_code}
          </code>
        </div>
        <button onClick={() => setShowQrOverlay(false)} className="w-full py-2 bg-neutral-900 dark:bg-gray-800 hover:bg-neutral-800 dark:hover:bg-gray-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer">
          Dismiss Viewer
        </button>
      </div>
    </div>
  );
}