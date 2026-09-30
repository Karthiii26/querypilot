import React, { useState } from 'react';
import {
  Database,
  Loader2,
  Search,
  Table as TableIcon,
  ChevronRight,
  Plug,
  RefreshCw
} from 'lucide-react';
import { DatabaseSchemaInfo } from '../types';
import { useAuth } from '../context/AuthContext';

interface DatabaseTabProps {
  schema: DatabaseSchemaInfo | null;
  isRefreshing: boolean;
  schemaRetryCount?: number;
  onSelectQuestion: (q: string) => void;
  onOpenConnectModal?: () => void;
}

export const DatabaseTab: React.FC<DatabaseTabProps> = ({
  schema,
  isRefreshing,
  schemaRetryCount = 0,
  onSelectQuestion,
  onOpenConnectModal
}) => {
  const { preferences } = useAuth();
  const hasConnectedDb = preferences.hasConnectedDb;

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const activeTableObj =
    schema?.tables.find((t) => t.table === (selectedTable || schema.tables[0]?.table)) ||
    schema?.tables[0] ||
    null;

  const filteredTables = schema?.tables.filter((t) =>
    t.table.toLowerCase().includes(searchFilter.toLowerCase().trim())
  ) || [];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Database Explorer</h2>
          <p className="text-sm text-slate-500 mt-1">
            Browse tables, inspect column schemas, and run quick queries on your connected database.
          </p>
        </div>
        {/* Auto-fetch spinner — shown while loading */}
        {isRefreshing && (
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Fetching data from Database...</span>
          </div>
        )}
      </div>

      {/* Disconnected State */}
      {!hasConnectedDb ? (
        <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 border border-slate-200/80 rounded-2xl p-9 text-center shadow-xs space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Plug className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No database connected</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mt-1">
              Please click below or go to <span className="font-semibold text-indigo-600">Settings</span> to connect your database.
            </p>
          </div>
          {onOpenConnectModal && (
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer"
            >
              <Plug className="w-3.5 h-3.5" /> Connect Database
            </button>
          )}
        </div>
      ) : isRefreshing && !schema ? (
        /* Actively loading — show dynamic fetching state */
        <div className="bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 border border-indigo-100 rounded-2xl p-10 text-center shadow-xs space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Fetching data from database...</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Connecting to database and discovering table structures. Please wait...
          </p>
        </div>
      ) : (!schema || schema.tables.length === 0) ? (
        /* Connected but empty / automatic retries exhausted */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-xs space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Unable to fetch schema automatically
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Automatic schema discovery could not retrieve tables. Please enter your database password to reconnect.
          </p>
          {onOpenConnectModal && (
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Enter Password & Reconnect
            </button>
          )}
        </div>
      ) : (
        /* Tables Explorer */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Table List Sidebar */}
          <div className="md:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-3 space-y-1 shadow-xs">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Tables ({schema.tables.length})
            </div>

            {/* Filter Input */}
            <div className="relative pb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search tables…"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-1">
              {filteredTables.map((tbl) => {
                const isSelected = (selectedTable || schema.tables[0]?.table) === tbl.table;
                return (
                  <button
                    key={tbl.table}
                    type="button"
                    onClick={() => setSelectedTable(tbl.table)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <TableIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate font-mono">{tbl.table}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-sans">
                      {(tbl.rowCount ?? 0).toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Table Details */}
          {activeTableObj && (
            <div className="md:col-span-8 space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
                      <TableIcon className="w-4 h-4 text-indigo-600" />
                      {activeTableObj.table}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {activeTableObj.columns.length} columns &middot; ~{(activeTableObj.rowCount ?? 0).toLocaleString()} rows
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectQuestion(`Show all records from ${activeTableObj.table}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition cursor-pointer"
                  >
                    Query Table <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Column Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Column Name</th>
                        <th className="py-2 px-3">Data Type</th>
                        <th className="py-2 px-3">Nullable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {activeTableObj.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{col.name}</td>
                          <td className="py-2.5 px-3 text-indigo-600 font-medium">{col.type}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-sans">{col.isNullable ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
