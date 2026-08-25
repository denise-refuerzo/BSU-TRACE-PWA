import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { usePWA } from '../context/PWAContext';

export default function PWAInstallBanner() {
  const { isInstallable, installApp } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('bsu_pwa_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // 60-second timer (change to 3000 for quick testing)
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('bsu_pwa_banner_dismissed', 'true');
  };

  const handleInstall = async () => {
    const installed = await installApp();
    if (installed) {
      setIsVisible(false);
    }
  };

  // Do not render if timer has not elapsed, session was dismissed, or browser has no install prompt
  if (!isVisible || isDismissed || !isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#2D1F1E] text-white p-4 rounded-2xl shadow-2xl border border-neutral-700 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-800 rounded-xl text-white flex-shrink-0">
            <Download size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">Install BSU-Trace</h4>
            <p className="text-[11px] text-neutral-300 font-medium mt-0.5 leading-snug">
              Install the app on your device for faster access and offline capabilities.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white font-bold transition-colors cursor-pointer"
        >
          Maybe Later
        </button>
        <button
          onClick={handleInstall}
          className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl uppercase tracking-wide transition-all shadow-sm cursor-pointer"
        >
          Install Now
        </button>
      </div>
    </div>
  );
}