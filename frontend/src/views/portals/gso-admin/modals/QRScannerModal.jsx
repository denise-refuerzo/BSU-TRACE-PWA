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
      <div className="bg-white dark:bg-[#180e10] w-full max-w-sm rounded-3xl border border-gray-200 dark:border-[#42292f] shadow-2xl p-6 text-center space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#42292f] pb-3">
          <h4 className="font-black text-neutral-900 dark:text-white text-sm flex items-center gap-2"><QrCode size={18} className="text-red-800 dark:text-red-400"/> GSO Scanner</h4>
          <button onClick={() => { setShowScannerModal(false); setSimulatedQrPayload(''); }} className="text-neutral-400 dark:text-gray-400 hover:text-neutral-600 dark:hover:text-gray-200 cursor-pointer"><X size={20} /></button>
        </div>

        <div className="bg-neutral-100 dark:bg-[#1c1113] p-1 rounded-xl flex font-bold text-[10px] border border-neutral-200 dark:border-gray-800">
          <button type="button" onClick={() => setScanMode('time-in')} className={`w-1/2 py-2 rounded-lg uppercase tracking-wider cursor-pointer ${scanMode === 'time-in' ? 'bg-white dark:bg-[#2b1317] text-blue-700 dark:text-blue-400 shadow-sm' : 'text-neutral-400 dark:text-gray-400'}`}>Arrival Scan-In</button>
          <button type="button" onClick={() => setScanMode('time-out')} className={`w-1/2 py-2 rounded-lg uppercase tracking-wider cursor-pointer ${scanMode === 'time-out' ? 'bg-white dark:bg-[#2b1317] text-green-700 dark:text-green-400 shadow-sm' : 'text-neutral-400 dark:text-gray-400'}`}>Release Scan-Out</button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-black relative h-56 flex items-center justify-center group">
          <Scanner onScan={(result) => { if (result?.[0]?.rawValue) { setSimulatedQrPayload(result[0].rawValue); executeSimulatedScanner(null, result[0].rawValue); } }} components={{ audio: false }} styles={{ container: { width: '100%', height: '100%', borderRadius: '1rem' } }} />
          <div className="absolute inset-0 pointer-events-none border-4 border-transparent group-hover:border-red-500/50 rounded-2xl"></div>
        </div>

        <form onSubmit={executeSimulatedScanner} className="pt-2 border-t border-neutral-100 dark:border-[#42292f]">
          <input type="text" placeholder="Or enter manual token..." value={simulatedQrInput} onChange={e => setSimulatedQrPayload(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-xs font-mono text-center rounded-xl outline-none focus:ring-1 focus:ring-red-800 mb-2 bg-neutral-50 dark:bg-[#1c1113] text-gray-900 dark:text-white placeholder:text-neutral-400" />
          <button type="submit" className="w-full bg-neutral-900 dark:bg-gray-800 hover:bg-black dark:hover:bg-gray-700 text-white text-xs py-2.5 font-bold rounded-xl uppercase tracking-wider cursor-pointer">Process Submission</button>
        </form>
      </div>
    </div>
  );
}