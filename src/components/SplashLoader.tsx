import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Logo } from './Logo';
import { getApiUrl } from '../api';

interface SplashLoaderProps {
  onReady: () => void;
  statusText?: string;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({ onReady, statusText: customStatusText }) => {
  const [internalStatusText, setInternalStatusText] = useState('Connecting to QueryPilot…');
  const [hasError, setHasError] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const isCheckingRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const minDisplayMs = 2500; // Always show for at least 2.5s
  const isReadyRef = useRef(false); // backend responded
  const minElapsedRef = useRef(false); // 2.5s elapsed
  const onReadyCalledRef = useRef(false);

  // 2.5s minimum display — once elapsed, if backend already ready, fire onReady
  useEffect(() => {
    const timer = setTimeout(() => {
      minElapsedRef.current = true;
      if (isReadyRef.current && !onReadyCalledRef.current) {
        onReadyCalledRef.current = true;
        onReady();
      }
    }, minDisplayMs);
    return () => clearTimeout(timer);
  }, [onReady]);

  const checkHealth = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    if (attemptCount === 0) {
      console.log(`[QueryPilot Splash] Polling backend health at: ${getApiUrl('/api/health') || '(relative) /api/health'}`);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(getApiUrl('/api/health'), {
        cache: 'no-store',
        signal: controller.signal,
        credentials: 'include'
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok' || data.ready === true) {
          isReadyRef.current = true;
          // Only call onReady if minimum display time has also elapsed
          if (minElapsedRef.current && !onReadyCalledRef.current) {
            onReadyCalledRef.current = true;
            onReady();
          }
          return;
        }
      }
    } catch {
      // Server warming up or network pending
    } finally {
      isCheckingRef.current = false;
      setAttemptCount((prev) => prev + 1);
    }
  }, [onReady]);

  // Update subtle status message based on time elapsed
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (elapsedSec < 5) {
        setInternalStatusText('Connecting to QueryPilot…');
      } else if (elapsedSec < 15) {
        setInternalStatusText('Connecting to services…');
      } else if (elapsedSec < 30) {
        setInternalStatusText('Preparing your workspace…');
      } else if (elapsedSec <= 120 && !hasError) {
        setInternalStatusText('Almost ready…');
      } else if (elapsedSec > 120 && !hasError) {
        setHasError(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hasError]);

  // Polling loop effect
  useEffect(() => {
    if (hasError) return;

    // Run first check immediately
    checkHealth();

    const interval = setInterval(() => {
      checkHealth();
    }, 1500);

    return () => clearInterval(interval);
  }, [checkHealth, hasError, attemptCount]);

  const handleRetry = () => {
    setHasError(false);
    setInternalStatusText('Connecting to QueryPilot…');
    startTimeRef.current = Date.now();
    setAttemptCount(0);
    checkHealth();
  };

  const displayText = customStatusText || internalStatusText;

  return (
    <div className="fixed inset-0 bg-[#f8f9fc] flex flex-col items-center justify-center p-6 text-slate-900 font-sans antialiased animate-fade-in select-none overflow-hidden">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* Brand Logo with ambient glow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
          <Logo className="w-16 h-16 sm:w-20 sm:h-20 relative drop-shadow-sm transition-transform duration-500" />
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            QueryPilot
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Ask your database anything.
          </p>
        </div>

        {/* Loading / Connecting State */}
        {!hasError ? (
          <div className="w-full flex flex-col items-center gap-4 pt-2 animate-fade-in">
            {/* Sleek Indeterminate Progress Bar */}
            <div className="w-48 h-1 bg-slate-200/80 rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-full animate-progress-indeterminate" />
            </div>

            {/* Subtle status text */}
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
              <span>{displayText}</span>
            </div>
          </div>
        ) : (
          /* Retry State */
          <div className="w-full flex flex-col items-center gap-4 pt-2 animate-fade-in">
            <div className="p-3 rounded-full bg-rose-50 border border-rose-100 text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-600 max-w-xs leading-relaxed">
              We&apos;re having trouble connecting to QueryPilot.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
