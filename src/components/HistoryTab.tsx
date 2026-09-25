import React from 'react';
import { Clock, Play, ArrowRight, Database, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { QueryPipelineResponse } from '../types';

interface HistoryTabProps {
  history: QueryPipelineResponse[];
  onSelectQuery: (item: QueryPipelineResponse) => void;
  onClearHistory: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onSelectQuery,
  onClearHistory
}) => {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Query History Yet</h3>
        <p className="text-sm text-slate-500">
          Questions you ask in the Ask tab will be recorded here with execution times, row counts, and generated SQL.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Query History</h2>
          <p className="text-sm text-slate-500">
            {history.length} {history.length === 1 ? 'item' : 'items'} in session history
          </p>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition"
        >
          Clear History
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item, idx) => {
          const isConversational = item.queryIntent === 'CONVERSATIONAL';
          return (
            <div
              key={item.requestId || idx}
              onClick={() => onSelectQuery(item)}
              className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 transition-all shadow-xs cursor-pointer flex items-center justify-between group"
            >
              <div className="space-y-1.5 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  {isConversational ? (
                    <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                  ) : item.execution.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition truncate">
                    {item.question}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  {isConversational ? (
                    <span className="font-semibold text-indigo-600">Conversational</span>
                  ) : (
                    <>
                      <span className="font-mono text-slate-600">
                        {item.execution.rowCount} row(s)
                      </span>
                      <span>•</span>
                      <span>{item.execution.executionTimeMs}ms</span>
                      {item.generatedSql && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-xs font-mono text-[11px] text-slate-500">
                            {item.generatedSql.replace(/\s+/g, ' ')}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  View <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
