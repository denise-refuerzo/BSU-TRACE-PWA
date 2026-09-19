import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import QRCode from 'react-qr-code';
import { fetchWithAuth } from '../../../api.js';
import { X, Smartphone, Wifi, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const SOCKET_URL = 'https://bsu-trace-pwa.onrender.com';

export default function CompanionScannerModal({ onClose, onScanSuccess }) {
  const [roomId] = useState(() => `bsu-room-${Math.random().toString(36).substring(2, 9)}`);
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const socketRef = useRef(null);

  const companionUrl = `${window.location.origin}/companion?room=${roomId}`;

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
    transports: ['websocket'], 
    secure: true
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join-companion-room', roomId);
    });

    socketRef.current.on('companion-device-joined', () => {
      setIsPhoneConnected(true);
    });

    // MATCHED EVENT: Listening for 'forward-scan' instead of 'companion-scanned-doc'
    socketRef.current.on('forward-scan', async ({ qrData, scanMode }) => {
      setIsPhoneConnected(true);
      const endpoint = scanMode === 'time-out' ? '/api/documents/scan-out' : '/api/documents/scan-in';

      try {
        const res = await fetchWithAuth(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCode: qrData })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to process document');

        // MATCHED EVENT: Emitting 'scan-result' instead of 'scan-result-relay'
        socketRef.current.emit('scan-result', {
          roomId,
          success: true,
          title: qrData,
          message: data.message || `Document ${scanMode === 'time-out' ? 'Released' : 'Timed In'}`
        });

        setActivityLogs(prev => [
          { id: Date.now(), success: true, text: `${scanMode.toUpperCase()}: ${qrData}`, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9)
        ]);

        if (onScanSuccess) onScanSuccess();

      } catch (err) {
        // MATCHED EVENT: Emitting 'scan-result' instead of 'scan-result-relay'
        socketRef.current.emit('scan-result', {
          roomId,
          success: false,
          title: qrData,
          message: err.message
        });

        setActivityLogs(prev => [
          { id: Date.now(), success: false, text: `Failed: ${err.message}`, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9)
        ]);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [roomId, onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-[100] p-4 flex items-center justify-center animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 text-left border border-neutral-200">
        
        {/* Header */}
        <div className="p-4 bg-neutral-900 text-white font-bold text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-[#D32F2F]" />
            <span>Mobile Companion Scanner</span>
          </div>
          <button onClick={onClose} className="hover:opacity-80 transition-opacity cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Status</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
              isPhoneConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <Wifi size={12} />
              {isPhoneConnected ? 'Phone Connected' : 'Waiting for connection'}
            </span>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 rounded-xl border border-neutral-200">
            <div className="bg-white p-3 rounded-lg shadow-sm border border-neutral-200">
              <QRCode value={companionUrl} size={150} />
            </div>
            <p className="text-[11px] font-medium text-neutral-500 mt-3 text-center leading-snug">
              Point your phone's native camera at this QR code.<br/>
              No login required on mobile.
            </p>
          </div>

          {/* Real-Time Scan History on PC */}
          <div>
            <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2">Live Session Scans</h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-neutral-400 italic py-2">Awaiting your first document scan from mobile...</p>
              ) : (
                activityLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-100 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      {log.success ? <CheckCircle size={14} className="text-emerald-600 shrink-0" /> : <AlertCircle size={14} className="text-red-600 shrink-0" />}
                      <span className="font-bold text-neutral-800 truncate">{log.text}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono shrink-0 ml-2">{log.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl shadow-sm cursor-pointer">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}