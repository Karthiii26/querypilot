import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Database,
  CheckCircle2,
  ArrowRight,
  Clock,
  Globe,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface OnboardingConnectModalProps {
  isOpen: boolean;
  userName: string;
  onConnect: (params: { projectUrl: string; password: string }) => Promise<void>;
  onSkip: () => void;
}

export const OnboardingConnectModal: React.FC<OnboardingConnectModalProps> = ({
  isOpen,
  userName,
  onConnect,
  onSkip
}) => {
  const { preferences, updatePreferences } = useAuth();
  const [projectUrl, setProjectUrl] = useState(preferences.lastProjectUrl || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const firstName = (userName || 'there').split(' ')[0];

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectUrl.trim() || !password.trim()) return;
    setError(null);
    setIsConnecting(true);
    try {
      await onConnect({ projectUrl: projectUrl.trim(), password: password.trim() });
      await updatePreferences({
        hasConnectedDb: true,
        lastProjectUrl: projectUrl.trim()
      });
      setConnected(true);
      setTimeout(onSkip, 1400);
    } catch (err: any) {
      setError(err.message || 'Could not connect. Please check your credentials.');
    } finally {
      setIsConnecting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md animate-scale-in-bounce">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">

          {/* Top gradient banner */}
          <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-7 pt-8 pb-10">
            {/* Close / Skip top-right */}
            <button
              type="button"
              onClick={onSkip}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Do this later"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-4 animate-pulse-ring">
              <Database className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-xl font-bold text-white leading-snug">
              {connected ? '🎉 Connected!' : `Welcome, ${firstName}!`}
            </h2>
            <p className="text-indigo-200 text-xs mt-1 leading-relaxed">
              {connected
                ? 'Your database is connected. Taking you to the dashboard…'
                : 'Connect your Supabase database to start querying it in plain English.'}
            </p>

            {/* Sparkle decoration */}
            <Sparkles className="absolute bottom-3 right-6 w-5 h-5 text-white/20" />
          </div>

          {/* Curved overlap effect */}
          <div className="-mt-4 bg-white rounded-t-3xl px-7 pt-6 pb-7 space-y-5">

            {connected ? (
              /* Success state */
              <div className="flex flex-col items-center gap-3 py-4 animate-scale-in">
                <div className="h-16 w-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-emerald-700">Database connected successfully</p>
              </div>
            ) : (
              /* Connect form */
              <form onSubmit={handleConnect} className="space-y-4">
                {/* Project URL */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    <Globe className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                    Supabase Project URL or ID
                  </label>
                  <input
                    type="text"
                    placeholder="https://xyzabcdef.supabase.co or xyzabcdef"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800 bg-slate-50 transition"
                  />
                  <p className="text-[11px] text-slate-400">
                    Found in your Supabase Dashboard → Project Settings → API.
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    <Key className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                    Database Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Your database password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 text-slate-800 bg-slate-50 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fade-slide-up">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onSkip}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Do this later
                  </button>
                  <button
                    type="submit"
                    disabled={isConnecting || !projectUrl.trim() || !password.trim()}
                    className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isConnecting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      <>
                        Connect Database
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Footer note */}
            {!connected && (
              <p className="text-center text-[11px] text-slate-400">
                Region is auto-detected. You can change databases anytime from Settings.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
