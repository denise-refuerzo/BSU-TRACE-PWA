import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Scanner } from '@yudiel/react-qr-scanner';
import { CheckCircle2, AlertCircle, ArrowDownLeft, ArrowUpRight, Wifi, WifiOff, Smartphone } from 'lucide-react';

const SOCKET_URL = 'https://bsu-trace-pwa.onrender.com';

export default function ContinuousMobileScanner() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room');

  const [connected, setConnected] = useState(false);
  const [scanMode, setScanMode] = useState('time-in'); // 'time-in' | 'time-out'
  const [status, setStatus] = useState('ready'); // 'ready' | 'processing' | 'success' | 'error'
  const [feedback, setFeedback] = useState({ title: '', message: 'Position document QR code within the frame' });

  const socketRef = useRef(null);
  const lastScanRef = useRef(null);
  const cooldownTimerRef = useRef(null);

  // 1. Screen Wake Lock (Keeps mobile screen awake indefinitely)
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('WakeLock failed:', err);
      }
    };
    requestWakeLock();

    const handleVisibility = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) wakeLock.release();
    };
  }, []);

  // 2. WebSocket Connection
  useEffect(() => {
    if (!roomId) return;

    socketRef.current = io(SOCKET_URL, {
    transports: ['websocket'], // CRITICAL: Forces pure WebSocket, skips Vercel long-polling failure
    secure: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      socketRef.current.emit('join-companion-room', roomId);
    });

    socketRef.current.on('disconnect', () => setConnected(false));

    // Listen for the desktop confirming the database update
    socketRef.current.on('scan-result', ({ success, message, title }) => {
      setStatus(success ? 'success' : 'error');
      setFeedback({
        title: title || (success ? 'Success' : 'Error'),
        message: message || ''
      });

      // Haptic Vibration feedback
      if (navigator.vibrate) {
        navigator.vibrate(success ? [100, 50, 100] : [300]);
      }

      // Reset to ready state after 2 seconds
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        setStatus('ready');
        setFeedback({ title: '', message: 'Ready for next document' });
        lastScanRef.current = null;
      }, 2200);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [roomId]);

  // 3. Scan Handler
  const handleScan = (detectedCodes) => {
    // Support @yudiel/react-qr-scanner output formats
    const rawValue = Array.isArray(detectedCodes) ? detectedCodes[0]?.rawValue : detectedCodes;
    if (!rawValue) return;

    const qrText = String(rawValue).trim();

    // Prevent spamming the same QR while processing
    if (qrText && qrText !== lastScanRef.current && status === 'ready' && connected) {
      lastScanRef.current = qrText;
      setStatus('processing');
      setFeedback({ title: 'Relaying to Desktop...', message: qrText });

      socketRef.current.emit('forward-scan', {
        roomId,
        qrData: qrText,
        scanMode
      });
    }
  };

  if (!roomId) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <Smartphone className="w-12 h-12 text-neutral-500 mb-4" />
        <h2 className="text-lg font-black uppercase tracking-tight">Invalid Pairing Link</h2>
        <p className="text-xs text-neutral-400 mt-1">Please scan the pairing QR code displayed on your PC dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between p-4 select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between py-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-neutral-200">BSU-Trace Companion</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
          {connected ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <Wifi size={12} /> Paired
            </span>
          ) : (
            <span className="text-red-400 flex items-center gap-1">
              <WifiOff size={12} /> Reconnecting
            </span>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <div className="my-3 grid grid-cols-2 gap-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
        <button
          type="button"
          onClick={() => { setScanMode('time-in'); lastScanRef.current = null; }}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            scanMode === 'time-in'
              ? 'bg-[#D32F2F] text-white shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ArrowDownLeft size={16} /> Time In
        </button>

        <button
          type="button"
          onClick={() => { setScanMode('time-out'); lastScanRef.current = null; }}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            scanMode === 'time-out'
              ? 'bg-neutral-100 text-neutral-950 shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ArrowUpRight size={16} /> Time Out
        </button>
      </div>

      {/* Camera Viewfinder */}
      <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden border-4 transition-colors duration-300 shadow-2xl flex items-center justify-center bg-black"
        style={{
          borderColor: status === 'success' ? '#10B981' : status === 'error' ? '#EF4444' : scanMode === 'time-in' ? '#D32F2F' : '#F5F5F5'
        }}
      >
        <Scanner
          onResult={handleScan}
          onError={() => {}}
          options={{ delayBetweenScanAttempts: 250 }}
        />
      </div>

      {/* Feedback Banner */}
      <div className="mt-4 p-4 rounded-xl border transition-all text-center min-h-[90px] flex flex-col items-center justify-center"
        style={{
          backgroundColor: status === 'success' ? 'rgba(16, 185, 129, 0.1)' : status === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          borderColor: status === 'success' ? 'rgba(16, 185, 129, 0.3)' : status === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'
        }}
      >
        {status === 'success' && <CheckCircle2 className="text-emerald-400 mb-1" size={24} />}
        {status === 'error' && <AlertCircle className="text-red-400 mb-1" size={24} />}
        
        {feedback.title && (
          <p className="text-xs font-black uppercase tracking-wide truncate max-w-[280px]">
            {feedback.title}
          </p>
        )}
        <p className="text-[11px] font-medium text-neutral-300 leading-snug mt-0.5">
          {feedback.message}
        </p>
      </div>

      <div className="text-center py-2 text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
        Screen stays awake automatically
      </div>
    </div>
  );
}