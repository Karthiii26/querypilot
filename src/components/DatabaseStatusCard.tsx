import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, Layers, RefreshCw, ShieldCheck, Cpu } from 'lucide-react';
import { DatabaseStatus } from '../types';

interface DatabaseStatusCardProps {
  dbStatus: DatabaseStatus | null;
  onOpenSchema: () => void;
  onOpenConnectDb: () => void;
  onRefreshSchema: () => void;
  isRefreshing: boolean;
}

export const DatabaseStatusCard: React.FC<DatabaseStatusCardProps> = ({
  dbStatus,
  onOpenSchema,
  onOpenConnectDb,
  onRefreshSchema,
  isRefreshing
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const isConnected = !!dbStatus;
  const connectionLabel = dbStatus?.connectionLabel || 'Supabase Cloud PostgreSQL';

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Simple End-User Connection Status */}
        <div className="flex items-center space-x-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {isConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            )}
          </span>
          <span className="text-xs font-semibold text-slate-900">
            {isConnected ? 'Database connected' : 'Connecting to database...'}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs text-slate-500 font-medium">
            {connectionLabel}
          </span>
        </div>

        {/* Action Controls & Technical Details Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <span>Technical details</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onOpenSchema}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Explore Schema</span>
          </button>

          <button
            onClick={onOpenConnectDb}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>Connect DB</span>
          </button>
        </div>
      </div>

      {/* Collapsible Technical Details Section */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 text-xs text-slate-600 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-100 font-mono text-[11px]">
            <div>
              <span className="text-slate-400">Database: </span>
              <span className="font-semibold text-slate-800">{dbStatus?.databaseName || 'postgres'}</span>
            </div>
            <div>
              <span className="text-slate-400">Provider: </span>
              <span className="text-slate-700">Supabase Cloud PostgreSQL</span>
            </div>
            <div>
              <span className="text-slate-400">Tables: </span>
              <span className="text-slate-700">{dbStatus?.tableCount ?? 0} tables</span>
            </div>
            <div>
              <span className="text-slate-400">Total Rows: </span>
              <span className="text-slate-700">{dbStatus?.totalRows || 0}+ rows discovered</span>
            </div>
            <button
              onClick={onRefreshSchema}
              disabled={isRefreshing}
              className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-sans text-xs ml-auto"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center space-x-1.5 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Safety: Read-only AST validation & parameterized execution</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-500">
              <Cpu className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Architecture: Dynamic schema discovery & automatic RAG</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
