import React from 'react';
import { createPortal } from 'react-dom';
import { LogOut, AlertTriangle } from 'lucide-react';

interface SignOutConfirmProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SignOutConfirm: React.FC<SignOutConfirmProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm animate-scale-in-bounce">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-rose-50 border-2 border-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sign out?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your session will end and you'll be returned to the login screen.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Stay signed in
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
