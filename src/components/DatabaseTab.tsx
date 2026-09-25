import React, { useState } from 'react';
import {
  Database,
  RefreshCw,
  Search,
  Table as TableIcon,
  Columns as ColumnsIcon,
  Hash,
  ChevronRight,
  Plug
} from 'lucide-react';
import { DatabaseSchemaInfo } from '../types';
import { useAuth } from '../context/AuthContext';

interface DatabaseTabProps {
  schema: DatabaseSchemaInfo | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSelectQuestion: (q: string) => void;
}

export const DatabaseTab: React.FC<DatabaseTabProps> = ({
  schema,
  isRefreshing,
  onRefresh,
  onSelectQuestion
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
        <div className="flex items-center gap-2">
          {hasConnectedDb && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Schema
            </button>
          )}
        </div>
      </div>

      {/* Disconnected State Notice */}
      {!hasConnectedDb ? (
        <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 border border-slate-200/80 rounded-2xl p-9 text-center shadow-xs space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Plug className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No database connected</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mt-1">
              Please navigate to the <span className="font-semibold text-indigo-600">Settings</span> tab to connect your Supabase database.
            </p>
          </div>
        </div>
      ) : (!schema || schema.tables.length === 0) ? (
        /* Empty Database State Notice (When DB is connected but empty) */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-xs space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Database connected, but no tables were found.
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Create a table in Supabase and click "Refresh Schema" to discover your schema objects dynamically.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Schema
          </button>
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
