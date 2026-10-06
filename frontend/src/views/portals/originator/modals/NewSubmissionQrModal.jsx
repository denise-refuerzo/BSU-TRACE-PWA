import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function NewSubmissionQrModal({ generatedQr, setShowQrModal }) {
  return (
    <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#180e10] rounded-2xl p-6 text-center max-w-sm w-full border border-neutral-200 dark:border-[#42292f] shadow-2xl space-y-4 animate-in zoom-in-95 duration-100">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center mx-auto text-xl font-bold">✓</div>
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Tracking Pipeline Open!</h3>
          <p className="text-xs text-neutral-400 dark:text-gray-400 mt-1">Your unique tracking token registry code is now active.</p>
        </div>
        <div className="bg-neutral-50 dark:bg-[#1c1113] p-6 border border-neutral-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center border-dashed">
          <QRCodeSVG 
            value={generatedQr} 
            size={140} 
            level={"H"} 
            includeMargin={true}
            fgColor={"#171717"}
          />
          <code className="text-[10px] mt-3 font-mono bg-white dark:bg-[#180e10] px-2 py-0.5 border border-neutral-200 dark:border-gray-700 rounded text-neutral-600 dark:text-gray-300 tracking-wider font-bold">
            {generatedQr}
          </code>
        </div>
        <button type="button" onClick={() => setShowQrModal(false)} className="w-full py-2 bg-neutral-900 dark:bg-gray-800 hover:bg-neutral-800 dark:hover:bg-gray-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer">
          Done & Close
        </button>
      </div>
    </div> 
  );
}