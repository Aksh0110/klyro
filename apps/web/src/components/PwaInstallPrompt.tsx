'use client';

import React, { useState, useEffect } from 'react';
import { Dumbbell, Download, X, Share, SquarePlus, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export const PwaInstallPrompt: React.FC = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Mobile device detection
    const ua = navigator.userAgent.toLowerCase();
    const mobileCheck =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) ||
      window.innerWidth < 768;

    setIsMobile(mobileCheck);
    if (!mobileCheck) return;

    const iosCheck = /iphone|ipad|ipod/.test(ua);
    setIsIos(iosCheck);

    if (iosCheck) {
      setShowPrompt(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPwaPrompt = e;
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }
    setShowPrompt(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [user]);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).deferredPwaPrompt : null);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setShowPrompt(false);
        }
      } catch (err) {
        console.error('PWA install error:', err);
      } finally {
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          (window as any).deferredPwaPrompt = null;
        }
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!user || !isMobile || !showPrompt) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 p-4 md:hidden animate-in slide-in-from-bottom duration-300 pointer-events-auto">
      <div className="bg-[#122131]/95 backdrop-blur-md border border-[#8b5cf6]/40 rounded-2xl p-4 shadow-2xl shadow-purple-950/50 space-y-3 relative overflow-hidden">
        {/* Glow accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8b5cf6] via-[#d0bcff] to-[#3395ff]" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8b5cf6] to-[#d0bcff] flex items-center justify-center text-white shadow-lg shadow-purple-900/40 shrink-0">
              <Dumbbell className="w-5 h-5 text-[#051424]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-[#d4e4fa]">Install Klyro App</h3>
                <Sparkles className="w-3.5 h-3.5 text-[#d0bcff]" />
              </div>
              <p className="text-[11px] text-[#958ea0]">
                Add to Home Screen for full-screen app experience
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-[#958ea0] hover:text-[#d4e4fa] hover:bg-[#1c2b3c] transition-colors"
            aria-label="Close prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic iOS or Android Guidance */}
        {isIos ? (
          <div className="p-2.5 rounded-xl bg-[#1c2b3c]/80 border border-[#273647] text-xs text-[#d4e4fa] space-y-1.5">
            <p className="font-semibold text-[#d0bcff] text-[11px]">iOS Home Screen Instructions:</p>
            <div className="flex items-center gap-2 text-[11px] text-[#958ea0]">
              <span className="flex items-center gap-1 text-[#d4e4fa] font-bold">
                1. Tap Share <Share className="w-3.5 h-3.5 text-[#3395ff] inline" />
              </span>
              <span>→</span>
              <span className="flex items-center gap-1 text-[#d4e4fa] font-bold">
                2. Tap &apos;Add to Home Screen&apos; <SquarePlus className="w-3.5 h-3.5 text-[#4edea3] inline" />
              </span>
            </div>
          </div>
        ) : deferredPrompt ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Install Klyro App</span>
            </button>
            <button
              onClick={handleDismiss}
              className="py-2.5 px-3 bg-[#1c2b3c] border border-[#273647] text-[#958ea0] font-bold text-xs rounded-xl hover:text-[#d4e4fa] transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-[#1c2b3c]/80 border border-[#273647] text-xs text-[#d4e4fa] space-y-1.5">
            <p className="font-semibold text-[#d0bcff] text-[11px]">Android / Mobile Installation:</p>
            <p className="text-[11px] text-[#958ea0]">
              Tap browser menu <span className="text-[#d4e4fa] font-bold">⋮</span> at top-right → select <span className="text-[#4edea3] font-bold">&apos;Add to Home screen&apos;</span> or <span className="text-[#3395ff] font-bold">&apos;Install app&apos;</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


