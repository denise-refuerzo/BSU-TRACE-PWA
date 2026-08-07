import React from 'react';
import { X } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function ScannerModal({
  setShowScannerModal,
  scanMode,
  setScanMode,
  simulatedQrInput,
  setSimulatedQrPayload,
  executeSimulatedScanner
}) {
  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl border shadow-2xl p-6 text-center space-y-5">
        
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-50 text-red-800 rounded-full flex items-center justify-center text-sm">📷</div>
            <h4 className="font-black text-neutral-900 text-sm">Live QR Scanner</h4>
          </div>
          <button onClick={() => { setShowScannerModal(false); setSimulatedQrPayload(''); }} className="text-neutral-400 hover:text-neutral-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="bg-neutral-100 p-1.5 rounded-xl flex border font-bold text-xs">
          <button type="button" onClick={() => setScanMode('time-in')} className={`w-1/2 py-2 rounded-lg transition-all uppercase tracking-wide ${scanMode === 'time-in' ? 'bg-white text-red-800 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>Time-In</button>
          <button type="button" onClick={() => setScanMode('time-out')} className={`w-1/2 py-2 rounded-lg transition-all uppercase tracking-wide ${scanMode === 'time-out' ? 'bg-white text-red-800 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}>Time-Out</button>
        </div>

        {/* LIVE CAMERA FEED AREA */}
        <div className="overflow-hidden rounded-2xl border-2 border-dashed border-red-200 bg-neutral-900 relative h-56 flex items-center justify-center group">
          <Scanner
            onScan={(result) => {
              // When the camera detects a code, immediately process it and stop scanning
              if (result && result.length > 0) {
                const scannedValue = result[0].rawValue;
                setSimulatedQrPayload(scannedValue);
                executeSimulatedScanner(null, scannedValue);
              }
            }}
            components={{ audio: false, zoom: false }}
            styles={{ container: { width: '100%', height: '100%', borderRadius: '1rem' } }}
          />
          <div className="absolute inset-0 pointer-events-none border-4 border-transparent group-hover:border-red-500/30 transition-colors rounded-2xl"></div>
        </div>

        <form onSubmit={(e) => executeSimulatedScanner(e)} className="space-y-3 pt-2 border-t border-neutral-100">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide text-left">Manual Fallback Input</p>
          <input 
            type="text" 
            placeholder="Type tracking token (TRK-...)" 
            value={simulatedQrInput} 
            onChange={e => setSimulatedQrPayload(e.target.value)} 
            className="w-full border px-4 py-2.5 text-xs font-mono text-center rounded-xl focus:ring-1 focus:ring-red-700 outline-none bg-neutral-50 placeholder:text-neutral-400" 
          />
          <button type="submit" className="w-full bg-neutral-900 hover:bg-black text-white text-xs py-2.5 font-bold rounded-xl shadow-sm uppercase tracking-wide transition-colors">
            Submit Manually
          </button>
        </form>

      </div>
    </div>
  );
}