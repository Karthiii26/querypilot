import React, { useState } from 'react';
import {
  MessageSquare,
  Clock,
  Database,
  Settings,
  HelpCircle,
  Sparkles,
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
      className="w-60 shrink-0 bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 h-screen sticky top-0"
    >
      <div className="space-y-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <Logo className="w-8 h-8 shrink-0 drop-shadow-xs" />
          <span className="text-xl font-bold text-slate-900 tracking-tight">
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-600' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-indigo-200/60 text-indigo-800 font-bold'
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

      {/* Bottom Navigation & Model Badge */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-indigo-600' : 'text-slate-500'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Model Attribution Badge */}
        <div className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium leading-none mb-1">
              Powered by
            </p>
            <p className="text-xs font-semibold text-slate-800 truncate leading-none">
              Gemini 2.5 Flash
            </p>
          </div>
        </div>

        {/* User Account / Sign Out */}
        {user && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate leading-none">
                  {user.fullName || user.email.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-400 truncate leading-none mt-1">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSignOutOpen(true)}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
