import React, { useState } from 'react';
import {
  MessageSquare,
  Clock,
  Database,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { SignOutConfirm } from './SignOutConfirm';

export type ActiveTab = 'ask' | 'history' | 'database' | 'settings' | 'help';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  historyCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  historyCount
}) => {
  const { user, logout } = useAuth();
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  const mainNavItems = [
    { id: 'ask' as const, label: 'Ask', icon: MessageSquare },
    { id: 'history' as const, label: 'History', icon: Clock, count: historyCount },
    { id: 'database' as const, label: 'Database', icon: Database }
  ];

  const bottomNavItems = [
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'help' as const, label: 'Help', icon: HelpCircle }
  ];

  return (
    <aside
      id="querypilot-sidebar"
      className="w-60 shrink-0 bg-white/95 backdrop-blur-md border-r border-slate-200/80 flex flex-col justify-between p-4 h-screen sticky top-0 shadow-xs"
    >
      <div className="space-y-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <Logo className="w-8 h-8 shrink-0 drop-shadow-sm" />
          <span className="text-xl font-bold bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent tracking-tight">
            QueryPilot
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold shadow-md shadow-indigo-500/20 translate-x-0.5'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white font-bold'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Navigation & User Profile */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <nav className="space-y-1" aria-label="Secondary Navigation">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold shadow-md shadow-indigo-500/20'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Account Card / Sign Out */}
        {user && (
          <div className="pt-3 border-t border-slate-100">
            <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-2 transition-all hover:bg-slate-100/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate leading-snug">
                    {user.fullName || user.email.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSignOutOpen(true)}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sign-out Confirmation */}
      <SignOutConfirm
        isOpen={isSignOutOpen}
        onConfirm={() => { setIsSignOutOpen(false); logout(); }}
        onCancel={() => setIsSignOutOpen(false)}
      />
    </aside>
  );
};
