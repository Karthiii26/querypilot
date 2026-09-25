import React from 'react';
import { BarChart3, BookOpen } from 'lucide-react';
import { DatabaseStatus } from '../types';
import { Logo } from './Logo';

interface HeaderProps {
  dbStatus: DatabaseStatus | null;
  onOpenSchema: () => void;
  onOpenEvaluation: () => void;
  onOpenConnectDb: () => void;
  onRefreshSchema: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  dbStatus,
  onOpenSchema,
  onOpenEvaluation,
  onOpenConnectDb,
}) => {
  const isConnected = !!dbStatus;

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center space-x-3">
          <Logo className="w-8 h-8 shrink-0 drop-shadow-xs" />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">QueryPilot</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Natural Language Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Ask your database anything in plain English
            </p>
          </div>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Simple Connection Indicator */}
          <button
            onClick={onOpenConnectDb}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
            title="Database connection"
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>Database connected</span>
          </button>

          {/* Schema Explorer */}
          <button
            onClick={onOpenSchema}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Schema Explorer</span>
          </button>

          {/* Benchmark Suite */}
          <button
            onClick={onOpenEvaluation}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition shadow-xs"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Evaluation Suite</span>
          </button>
        </div>
      </div>
    </header>
  );
};
