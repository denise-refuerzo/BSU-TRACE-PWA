import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function NewSubmissionQrModal({ generatedQr, setShowQrModal }) {
  return (
    <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full border shadow-2xl space-y-4 animate-in zoom-in-95 duration-100">
        <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto text-xl font-bold">✓</div>
        <div>
          <h3 className="text-lg font-bold text-neutral-900">Tracking Pipeline Open!</h3>
          <p className="text-xs text-neutral-400 mt-1">Your unique tracking token registry code is now active.</p>
        </div>
        <div className="bg-neutral-50 p-6 border rounded-xl flex flex-col items-center justify-center border-dashed">
          <QRCodeSVG 
            value={generatedQr} 
            size={140} 
            level={"H"} 
            includeMargin={true}
            fgColor={"#171717"}
          />
          <code className="text-[10px] mt-3 font-mono bg-white px-2 py-0.5 border rounded text-neutral-600 tracking-wider font-bold">
            {generatedQr}
          </code>
        </div>
        <button type="button" onClick={() => setShowQrModal(false)} className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs rounded-lg transition-colors">
          Done & Close
        </button>
      </div>
    </div> 
  );
}