import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, AlertCircle, ArrowDownLeft, ArrowUpRight, Wifi, WifiOff, Smartphone } from 'lucide-react';

const SOCKET_URL = 'https://bsu-trace-pwa.onrender.com';

export default function ContinuousMobileScanner() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room');

  const [connected, setConnected] = useState(false);
  const [scanMode, setScanMode] = useState('time-in'); 
  const [status, setStatus] = useState('ready'); 
  const [feedback, setFeedback] = useState({ title: '', message: 'Align document QR code inside the box' });
  const [debugLog, setDebugLog] = useState('Initializing camera engine...');
  
  const [latestScan, setLatestScan] = useState(null);

  const socketRef = useRef(null);
  const lastScanRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

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

  useEffect(() => {
    if (!roomId) return;

    socketRef.current = io(SOCKET_URL, {
      secure: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
      socketRef.current.emit('join-companion-room', roomId);
      setDebugLog('Connected to server room.');
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
      setDebugLog('Disconnected from server.');
    });

    socketRef.current.on('scan-result', ({ success, message, title }) => {
      setStatus(success ? 'success' : 'error');
      setFeedback({
        title: title || (success ? 'Success' : 'Error'),
        message: message || ''
      });
      setDebugLog(`Result: ${message}`);

      if (navigator.vibrate) {
        navigator.vibrate(success ? [100, 50, 100] : [300]);
      }

      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        setStatus('ready');
        setFeedback({ title: '', message: 'Ready for next document' });
        lastScanRef.current = null;
        setLatestScan(null); 
      }, 2200);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [roomId]);

  useEffect(() => {
    if (!latestScan || !connected || status !== 'ready') return;
    
    if (latestScan !== lastScanRef.current) {
      lastScanRef.current = latestScan;
      setStatus('processing');
      setFeedback({ title: 'Relaying to Desktop...', message: latestScan });

      socketRef.current.emit('forward-scan', {
        roomId,
        qrData: latestScan,
        scanMode
      });
    }
  }, [latestScan, connected, status, roomId, scanMode]);

  useEffect(() => {
    let isMounted = true;
    const qrRegionId = 'html5qr-code-full-region';
    
    const timer = setTimeout(() => {
      if (!isMounted) return;

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(qrRegionId);
      }

      const config = { fps: 15, qrbox: { width: 250, height: 250 } };

      html5QrCodeRef.current.start(
        { facingMode: 'environment' }, 
        config,
        (decodedText) => {
          const qrText = String(decodedText).trim();
          setDebugLog(`Scanned: ${qrText}`);
          setLatestScan(qrText);
        },
        () => {} 
      ).catch((err) => {
        console.error('Camera initialization failed:', err);
        setDebugLog(`Cam Error: ${err?.message || err}`);
        setFeedback({ title: 'Camera Error', message: 'Could not access camera. Check browser permissions.' });
      });
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error('Failed to stop scanner:', err));
      }
    };
  }, []);

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

      {/* Html5Qrcode Reader Viewport Container */}
      <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden border-4 transition-colors duration-300 shadow-2xl bg-black"
        style={{
          borderColor: status === 'success' ? '#10B981' : status === 'error' ? '#EF4444' : scanMode === 'time-in' ? '#D32F2F' : '#F5F5F5'
        }}
      >
        <div id="html5qr-code-full-region" className="w-full h-full" />
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

      {/* Live Debug Text */}
      <div className="text-center py-1 text-[9px] text-neutral-400 font-mono truncate">
        Status: {debugLog}
      </div>
    </div>
  );
}