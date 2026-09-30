import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Key,
  Globe,
  Eye,
  EyeOff
} from 'lucide-react';
import { DatabaseConnectionType } from '../types';
import { useAuth } from '../context/AuthContext';

interface ConnectDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConnection?: string;
  connectionType?: DatabaseConnectionType;
  onConnect: (params: { projectUrl: string; password: string }) => Promise<void>;
  onResetToDemo?: () => Promise<void>;
  reconnectNotice?: string | null;
}

export const ConnectDatabaseModal: React.FC<ConnectDatabaseModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  reconnectNotice
}) => {
  const { preferences } = useAuth();
  const [projectUrl, setProjectUrl] = useState(preferences.lastProjectUrl || '');
  const [dbPassword, setDbPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      if (!projectUrl.trim() || !dbPassword.trim()) {
        throw new Error('Please enter both your Database Host / Project URL and Password.');
      }
      await onConnect({
        projectUrl: projectUrl.trim(),
        password: dbPassword.trim()
      });
      setStatusMessage({ type: 'success', text: 'Connected to Database successfully!' });
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Connection failed.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] animate-scale-in-bounce">

        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Connect Database</h2>
              <p className="text-xs text-slate-500">Link your database to start querying</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">

          {/* Reconnect Prompt Banner */}
          {reconnectNotice && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Re-authentication Required</p>
                <p className="text-amber-800 text-[11px] leading-relaxed">{reconnectNotice}</p>
              </div>
            </div>
          )}

          {/* Connect Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <Globe className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Database Host / Project URL
              </label>
              <input
                type="text"
                placeholder="https://yourproject.supabase.co or project-id"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Found in your database dashboard settings.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <Key className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Database Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your database password"
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  className="w-full px-3.5 py-2 pr-10 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
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

            {/* Status or Error Notice */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs space-y-1 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
                {statusMessage.details && (
                  <p className="text-[11px] text-slate-600 pl-6 leading-relaxed">
                    {statusMessage.details}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || !projectUrl.trim() || !dbPassword.trim()}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 transition cursor-pointer"
              >
                {isProcessing ? 'Connecting…' : 'Connect Database'}
              </button>
            </div>
          </form>

          {/* Setup Guide Link */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Need database credentials?</span>
            <a
              href="https://supabase.com/dashboard/project/_/settings/database"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium transition"
            >
              <ExternalLink className="w-3 h-3" />
              Open Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
