import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Shield, Database, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SignOutConfirm } from './SignOutConfirm';

export const UserDropdown: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initial = (user.fullName || user.email || 'U').charAt(0).toUpperCase();

  const handleLogoutClick = () => {
    setIsOpen(false);
    setIsConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsConfirmOpen(false);
    logout();
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          id="user-profile-button"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
        >
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            {initial}
          </div>
          <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate hidden sm:inline-block">
            {user.fullName || user.email.split('@')[0]}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200/90 shadow-xl py-2 z-50 animate-fade-slide-down">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user.fullName || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate" title={user.email}>
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Supabase Cloud Badge */}
              <div className="mt-3 flex items-center justify-between text-[11px] bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-1.5 text-slate-600">
                <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Supabase Cloud DB
                </span>
                <span className="font-mono text-slate-500 uppercase text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  {user.role}
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <div className="px-4 py-2 text-xs text-slate-400 flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>Project: egrptqojfqkfjlnfxump</span>
              </div>
              <div className="px-4 py-2 text-xs text-slate-400 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Auth: Supabase PostgreSQL</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-1">
              <button
                id="user-logout-button"
                type="button"
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/80 transition text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sign-out Confirmation */}
      <SignOutConfirm
        isOpen={isConfirmOpen}
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
};
