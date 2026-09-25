import React, { useState, useMemo } from 'react';
import {
  Table as TableIcon,
  Code2,
  Copy,
  Check,
  Download,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Search,
  Clock,
  Database
} from 'lucide-react';
import { QueryPipelineResponse } from '../types';
import { PipelineTracker } from './PipelineTracker';

interface ResultDisplayProps {
  response: QueryPipelineResponse;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ response }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { execution, validation, generatedSql, formattedSql, explanation, retrievedTables } = response;

  const handleCopySql = () => {
    navigator.clipboard.writeText(formattedSql || generatedSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleExportCsv = () => {
    if (!execution.rows || execution.rows.length === 0) return;
    const headers = execution.columns.join(',');
    const rows = execution.rows.map(r =>
      execution.columns
        .map(col => {
          const val = r[col];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `querypilot_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered and sorted table data
  const filteredRows = useMemo(() => {
    let list = execution.rows || [];
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(q))
      );
    }
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        return sortDir === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }
    return list;
  }, [execution.rows, tableSearch, sortCol, sortDir]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Natural Language Explanation & Insights Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center space-x-2 text-indigo-600 mb-2.5">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Insights & Summary
          </span>
        </div>
        <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
          {explanation || 'Analysis completed.'}
        </div>
      </div>

      {/* 2. Results Table Card */}
      {execution.success ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <TableIcon className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-900">Query Results</span>
              <span className="text-xs text-slate-500">
                ({execution.rowCount} row{execution.rowCount === 1 ? '' : 's'})
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter rows..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-44"
                />
              </div>

              <button
                onClick={handleExportCsv}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {execution.columns.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Query completed but returned no tabular columns.
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No rows match the search query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {execution.columns.map((col, idx) => (
                      <th
                        key={idx}
                        onClick={() => toggleSort(col)}
                        className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100 transition select-none"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{col}</span>
                          {sortCol === col && (
                            <span className="text-indigo-600 font-bold">
                              {sortDir === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition">
                      {execution.columns.map((col, cIdx) => {
                        const val = row[col];
                        const isNumeric = typeof val === 'number';
                        return (
                          <td
                            key={cIdx}
                            className={`px-4 py-2.5 text-slate-800 ${
                              isNumeric ? 'font-mono' : ''
                            }`}
                          >
                            {val === null || val === undefined ? (
                              <span className="text-slate-400 italic">null</span>
                            ) : typeof val === 'boolean' ? (
                              val ? (
                                <span className="text-emerald-700 font-medium">true</span>
                              ) : (
                                <span className="text-slate-500">false</span>
                              )
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
              <span>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} rows
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-medium"
                >
                  Previous
                </button>
                <span className="font-mono text-xs px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Execution / Validation Error Banner */
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-900 text-xs shadow-xs">
          <div className="flex items-center space-x-2 font-semibold text-rose-950 mb-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Query Error</span>
          </div>
          <p className="font-mono text-slate-800">{execution.error || validation.errors.join('; ')}</p>
        </div>
      )}

      {/* 3. Collapsible Query Details / Technical Details */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/60 transition text-left"
        >
          <div className="flex items-center space-x-2.5">
            <Code2 className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-800">
              Query details
            </span>
            {response.selfCorrected && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                Self-Corrected (Retry #{response.retryCount})
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
            <span>{showTechnicalDetails ? 'Hide technical details' : 'Show technical details'}</span>
            {showTechnicalDetails ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {showTechnicalDetails && (
          <div className="p-4 sm:px-6 pt-0 border-t border-slate-100 space-y-4 animate-fadeIn">
            {/* Pipeline Stage Tracker */}
            {response.pipelineStages && response.pipelineStages.length > 0 && (
              <div className="pt-4">
                <PipelineTracker
                  stages={response.pipelineStages}
                  totalLatencyMs={response.totalLatencyMs}
                  selfCorrected={response.selfCorrected}
                />
              </div>
            )}

            {/* SQL Code Box */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Generated SQL Query
                </span>
                <button
                  onClick={handleCopySql}
                  className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
                <code>{formattedSql || generatedSql || '-- No SQL generated'}</code>
              </pre>
            </div>

            {/* Self-Correction Log (if present) */}
            {response.correctionLog && response.correctionLog.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <div className="flex items-center space-x-1.5 font-semibold text-amber-900 mb-1">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Self-Correction Recovery Log</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-800 font-mono text-[11px]">
                  {response.correctionLog.map((log, lIdx) => (
                    <li key={lIdx}>{log}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Technical Metadata Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tables Referenced */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Tables Referenced
                </span>
                <div className="flex flex-wrap gap-1">
                  {retrievedTables && retrievedTables.length > 0 ? (
                    retrievedTables.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-white border border-slate-200 text-slate-800"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">None</span>
                  )}
                </div>
              </div>

              {/* Safety & AST Verification */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Safety & Validation
                </span>
                <div className="flex items-center space-x-1.5 text-emerald-700 font-medium">
                  {validation.isReadOnly ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Read-Only Validated</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span className="text-rose-700">Modification Blocked</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  Statement: {validation.statementType}
                </div>
              </div>

              {/* Execution Latency */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Execution Latency
                </span>
                <div className="flex items-center space-x-1 text-slate-800 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Database: {execution.executionTimeMs}ms</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Total Latency: {response.totalLatencyMs}ms
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
