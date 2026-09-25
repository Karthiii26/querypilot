import React from 'react';
import {
  Database,
  Hash,
  Columns,
  ChevronRight,
  RefreshCw,
  Layers,
  Plug
} from 'lucide-react';
import { DatabaseSchemaInfo } from '../types';
import { useAuth } from '../context/AuthContext';

interface ExploreYourDataProps {
  schema: DatabaseSchemaInfo | null;
  isRefreshing: boolean;
  onSelectQuestion: (question: string) => void;
  onRefreshSchema: () => void;
}

const PALETTE = [
  { bg: 'bg-indigo-50', text: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' },
  { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  { bg: 'bg-sky-50', text: 'text-sky-600', badge: 'bg-sky-100 text-sky-700' },
  { bg: 'bg-rose-50', text: 'text-rose-600', badge: 'bg-rose-100 text-rose-700' },
];

function toLabel(tableName: string): string {
  return tableName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function suggestionsForTable(tableName: string, columns: string[]): string[] {
  const label = toLabel(tableName);
  const hasDate = columns.some((c) => /date|time|created|updated|at$/i.test(c));
  const numericCol = columns.find((c) =>
    /amount|total|count|price|value|score|qty|quantity|revenue|cost|salary/i.test(c)
  );
  const statusCol = columns.find((c) =>
    /status|state|type|category|kind|role/i.test(c)
  );

  const suggestions: string[] = [`How many ${label} are there?`];

  if (numericCol) {
    suggestions.push(`Show the top 10 ${label} by ${numericCol.replace(/_/g, ' ')}`);
  } else if (hasDate) {
    suggestions.push(`Show the most recently added ${label}`);
  } else {
    suggestions.push(`Show me all ${label}`);
  }

  if (statusCol) {
    suggestions.push(`Group ${label} by ${statusCol.replace(/_/g, ' ')} and count each`);
  } else if (hasDate && suggestions.length < 3) {
    suggestions.push(`How many ${label} were added in the last 30 days?`);
  }

  return suggestions.slice(0, 3);
}

export const ExploreYourData: React.FC<ExploreYourDataProps> = ({
  schema,
  isRefreshing,
  onSelectQuestion,
  onRefreshSchema,
}) => {
  const { preferences } = useAuth();
  const hasConnectedDb = preferences.hasConnectedDb;

  if (isRefreshing) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Explore your data</h3>
          <p className="text-xs text-slate-500">Browse the data available in your connected database.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-4 animate-pulse space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-slate-100" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-slate-100 rounded w-24" />
                  <div className="h-2.5 bg-slate-100 rounded w-16" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 bg-slate-100 rounded w-full" />
                <div className="h-2.5 bg-slate-100 rounded w-4/5" />
                <div className="h-2.5 bg-slate-100 rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasConnectedDb) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Explore your data</h3>
            <p className="text-xs text-slate-500">Connect a database in Settings to browse schema tables.</p>
          </div>
        </div>
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-7 text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Plug className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No database connected</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Please go to the <span className="font-semibold text-indigo-600">Settings</span> tab to connect your Supabase database.
          </p>
        </div>
      </div>
    );
  }

  if (!schema || schema.tables.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Explore your data</h3>
            <p className="text-xs text-slate-500">Browse the data available in your connected database.</p>
          </div>
          <button type="button" onClick={onRefreshSchema} className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-7 text-center shadow-xs space-y-3">
          <div className="mx-auto w-11 h-11 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">No tables found yet</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">Create a table in Supabase and click Refresh to discover your schema.</p>
          <button type="button" onClick={onRefreshSchema} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Schema
          </button>
        </div>
      </div>
    );
  }

  const topTables = [...schema.tables].sort((a, b) => (b.rowCount ?? 0) - (a.rowCount ?? 0)).slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Explore your data</h3>
          <p className="text-xs text-slate-500">Browse the data available in your connected database.</p>
        </div>
        <button type="button" onClick={onRefreshSchema} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-600 transition cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {topTables.map((tbl, idx) => {
          const palette = PALETTE[idx % PALETTE.length];
          const columnNames = tbl.columns.map((c) => c.name);
          const suggestions = suggestionsForTable(tbl.table, columnNames);

          return (
            <div key={tbl.table} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col gap-3 hover:shadow-md hover:border-slate-300 transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${palette.bg} ${palette.text} flex items-center justify-center shrink-0`}>
                  <Database className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate font-mono">{tbl.table}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${palette.badge}`}>
                      <Hash className="w-2.5 h-2.5" />{(tbl.rowCount ?? 0).toLocaleString()} rows
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Columns className="w-2.5 h-2.5" />{tbl.columns.length} cols
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                {suggestions.map((q, qIdx) => (
                  <button
                    key={qIdx}
                    id={`explore-${tbl.table}-q${qIdx}`}
                    type="button"
                    onClick={() => onSelectQuestion(q)}
                    className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50/80 hover:bg-indigo-50 hover:text-indigo-800 border border-transparent hover:border-indigo-200 transition-all text-xs font-medium text-slate-600 group cursor-pointer"
                  >
                    <span className="leading-snug line-clamp-2">{q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {schema.tables.length > 6 && (
        <p className="text-[11px] text-center text-slate-400 font-medium pt-1">
          Showing top 6 of {schema.tables.length} tables by row count &middot; Open <span className="text-indigo-500 font-semibold">Database Explorer</span> to browse all tables
        </p>
      )}
    </div>
  );
};
