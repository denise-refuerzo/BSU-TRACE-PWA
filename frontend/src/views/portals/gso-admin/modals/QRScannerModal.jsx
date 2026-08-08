import React from 'react';
import { X, QrCode } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function QRScannerModal({
  showScannerModal,
  setShowScannerModal,
  scanMode,
  setScanMode,
  simulatedQrInput,
  setSimulatedQrPayload,
  executeSimulatedScanner
}) {
  if (!showScannerModal) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl border shadow-2xl p-6 text-center space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h4 className="font-black text-neutral-900 text-sm flex items-center gap-2"><QrCode size={18} className="text-red-800"/> GSO Scanner</h4>
          <button onClick={() => { setShowScannerModal(false); setSimulatedQrPayload(''); }} className="text-neutral-400 hover:text-neutral-600"><X size={20} /></button>
        </div>

        <div className="bg-neutral-100 p-1 rounded-xl flex font-bold text-[10px]">
          <button type="button" onClick={() => setScanMode('time-in')} className={`w-1/2 py-2 rounded-lg uppercase tracking-wider ${scanMode === 'time-in' ? 'bg-white text-blue-700 shadow-sm' : 'text-neutral-400'}`}>Arrival Scan-In</button>
          <button type="button" onClick={() => setScanMode('time-out')} className={`w-1/2 py-2 rounded-lg uppercase tracking-wider ${scanMode === 'time-out' ? 'bg-white text-green-700 shadow-sm' : 'text-neutral-400'}`}>Release Scan-Out</button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-black relative h-56 flex items-center justify-center group">
          <Scanner onScan={(result) => { if (result?.[0]?.rawValue) { setSimulatedQrPayload(result[0].rawValue); executeSimulatedScanner(null, result[0].rawValue); } }} components={{ audio: false }} styles={{ container: { width: '100%', height: '100%', borderRadius: '1rem' } }} />
          <div className="absolute inset-0 pointer-events-none border-4 border-transparent group-hover:border-red-500/50 rounded-2xl"></div>
        </div>

        <form onSubmit={executeSimulatedScanner} className="pt-2 border-t">
          <input type="text" placeholder="Or enter manual token..." value={simulatedQrInput} onChange={e => setSimulatedQrPayload(e.target.value)} className="w-full border px-4 py-2.5 text-xs font-mono text-center rounded-xl outline-none focus:ring-1 focus:ring-red-800 mb-2 bg-neutral-50" />
          <button type="submit" className="w-full bg-neutral-900 hover:bg-black text-white text-xs py-2.5 font-bold rounded-xl uppercase tracking-wider">Process Submission</button>
        </form>
      </div>
    </div>
  );
}