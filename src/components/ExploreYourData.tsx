import React from 'react';
import {
  Database,
  Hash,
  Columns,
  ChevronRight,
  Layers,
  Plug,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { DatabaseSchemaInfo } from '../types';
import { useAuth } from '../context/AuthContext';

interface ExploreYourDataProps {
  schema: DatabaseSchemaInfo | null;
  isRefreshing: boolean;
  schemaRetryCount?: number;
  onSelectQuestion: (question: string) => void;
  onOpenConnectModal: (reauth?: boolean) => void;
  onRefreshSchema?: () => void;
}

const PALETTE = [
  { bg: 'bg-indigo-50', text: 'text-indigo-600', badge: 'bg-indigo-100/80 text-indigo-700', border: 'hover:border-indigo-300' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100/80 text-emerald-700', border: 'hover:border-emerald-300' },
  { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'bg-violet-100/80 text-violet-700', border: 'hover:border-violet-300' },
  { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100/80 text-amber-700', border: 'hover:border-amber-300' },
  { bg: 'bg-sky-50', text: 'text-sky-600', badge: 'bg-sky-100/80 text-sky-700', border: 'hover:border-sky-300' },
  { bg: 'bg-rose-50', text: 'text-rose-600', badge: 'bg-rose-100/80 text-rose-700', border: 'hover:border-rose-300' },
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
  onOpenConnectModal,
  onRefreshSchema,
}) => {
  const { preferences } = useAuth();
  const hasConnectedDb = preferences.hasConnectedDb;

  // 1. Actively fetching / retrying state (only when DB is connected)
  if (isRefreshing && hasConnectedDb) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Explore your data</h3>
          <p className="text-xs text-slate-500">Browse the data available in your connected database.</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 border border-indigo-100 rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">Fetching data from database...</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Connecting to database and discovering table schemas. Please wait...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. No database connected at all
  if (!hasConnectedDb) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Explore your data</h3>
            <p className="text-xs text-slate-500">Connect a database in Settings to browse schema tables.</p>
          </div>
        </div>
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-7 text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Plug className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No database connected</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Please connect your database to explore tables and ask natural language questions.
          </p>
          <button
            type="button"
            onClick={() => onOpenConnectModal(false)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer"
          >
            <Plug className="w-3.5 h-3.5" /> Connect Database
          </button>
        </div>
      </div>
    );
  }

  // 3. Connected with 0 tables in cloud DB
  if (schema && schema.tables.length === 0) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Explore your data</h3>
            <p className="text-xs text-slate-500">Browse the data available in your connected database.</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-7 text-center shadow-xs space-y-3">
          <div className="mx-auto w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Database connected (0 tables found)</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Your database is connected successfully, but contains no tables yet. Create tables in your cloud database console and refresh to start querying.
          </p>
          {onRefreshSchema && (
            <button
              type="button"
              onClick={onRefreshSchema}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Schema
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Explore your data</h3>
            <p className="text-xs text-slate-500">Browse the data available in your connected database.</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-7 text-center shadow-xs space-y-3">
          <div className="mx-auto w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Unable to fetch schema</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Could not fetch database schema automatically. Please reconnect with your database password.
          </p>
          <button
            type="button"
            onClick={() => onOpenConnectModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reconnect Database
          </button>
        </div>
      </div>
    );
  }

  const topTables = [...schema.tables].sort((a, b) => (b.rowCount ?? 0) - (a.rowCount ?? 0)).slice(0, 6);

  // 4. Active Tables view with Entrance Animations & Transitions
  return (
    <div className="space-y-3 animate-fade-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            Explore your data
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 animate-scale-in">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {schema.tables.length} tables discovered
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Browse the data available in your connected database.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {topTables.map((tbl, idx) => {
          const palette = PALETTE[idx % PALETTE.length];
          const columnNames = tbl.columns.map((c) => c.name);
          const suggestions = suggestionsForTable(tbl.table, columnNames);

          return (
            <div
              key={tbl.table}
              style={{ animationDelay: `${idx * 75}ms` }}
              className={`group bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col gap-3 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg ${palette.border} animate-fade-slide-up`}
            >
              {/* Card Header */}
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${palette.bg} ${palette.text} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 shadow-xs`}>
                  <Database className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate font-mono group-hover:text-indigo-600 transition-colors">{tbl.table}</p>
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

              {/* Suggestions list */}
              <div className="space-y-1.5">
                {suggestions.map((q, qIdx) => (
                  <button
                    key={qIdx}
                    id={`explore-${tbl.table}-q${qIdx}`}
                    type="button"
                    onClick={() => onSelectQuestion(q)}
                    className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50/80 hover:bg-indigo-50 hover:text-indigo-800 border border-transparent hover:border-indigo-200 transition-all duration-200 text-xs font-medium text-slate-600 cursor-pointer"
                  >
                    <span className="leading-snug line-clamp-2">{q}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 group-hover:translate-x-1 transition-transform duration-200" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {schema.tables.length > 6 && (
        <p className="text-[11px] text-center text-slate-400 font-medium pt-1 animate-fade-in">
          Showing top 6 of {schema.tables.length} tables by row count &middot; Open <span className="text-indigo-500 font-semibold">Database Explorer</span> to browse all tables
        </p>
      )}
    </div>
  );
};
