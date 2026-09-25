import React, { useState, useMemo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import {
  CheckCircle2,
  Clock,
  Code2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldCheck,
  Download,
  Database,
  Bot,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { QueryPipelineResponse } from '../types';
import { SmartVisualization } from './visualization/SmartVisualization';
import { analyzeDataset } from './visualization/detectVisualization';
import { formatCellValue, formatColumnLabel } from './visualization/formatters';
import { ResultsLoadingSkeleton } from './visualization/LoadingSkeleton';

interface ResultsSectionProps {
  response: QueryPipelineResponse | null;
  isLoading?: boolean;
  timestampText?: string;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  response,
  isLoading = false,
  timestampText = 'Just now'
}) => {
  const [isQueryExpanded, setIsQueryExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const pageSize = 8;

  // Derive rows/columns safely — needed for useMemo below (must run before any early returns)
  const rows = response?.execution?.rows || [];
  const columns = response?.execution?.columns || [];

  // Analyze dataset — computed unconditionally so hook order is stable
  const datasetAnalysis = useMemo(
    () => analyzeDataset(rows, columns, response?.question ?? ''),
    [rows, columns, response?.question]
  );

  // Filtered & Sorted Table Rows — MUST be before any early returns (Rules of Hooks)
  const filteredRows = useMemo(() => {
    let list = rows;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter((r) =>
        Object.values(r).some((val) => String(val).toLowerCase().includes(q))
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
  }, [rows, tableSearch, sortCol, sortDir]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleCopySql = (sqlText: string) => {
    navigator.clipboard.writeText(sqlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCsv = () => {
    if (!rows || rows.length === 0) return;
    const csvRows = [columns.join(',')];
    rows.forEach((r) => {
      const line = columns
        .map((c) => {
          const val = r[c];
          if (val === null || val === undefined) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
      csvRows.push(line);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `querypilot_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // — Early returns AFTER all hooks — //

  // 1. Loading State
  if (isLoading) {
    return <ResultsLoadingSkeleton />;
  }

  // 2. Conversational Message State
  const isConversational =
    response?.queryIntent === 'CONVERSATIONAL' ||
    (!response?.generatedSql && (!response?.execution?.columns || response.execution.columns.length === 0) && Boolean(response?.explanation));

  if (isConversational && response) {
    return (
      <div id="querypilot-conversational-section" className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">QueryPilot Assistant</h3>
                <p className="text-[11px] text-slate-400 font-medium">Conversational Response</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{timestampText}</span>
            </div>
          </div>

          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 rounded-xl p-4 border border-slate-100 font-sans">
            {response.explanation}
          </div>
        </div>
      </div>
    );
  }

  // 3. Null Initial State
  if (!response) {
    return (
      <div id="querypilot-results-section" className="space-y-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-xs space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Ask any question to execute live queries against your database.
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            QueryPilot uses live schema discovery, read-only AST safety validation, and smart visualization selection to deliver instant data insights.
          </p>
        </div>
      </div>
    );
  }

  // 4. Query Execution Failure / Error Card
  if (!response.execution?.success) {
    const rawError = response.explanation || response.execution?.error || 'Query execution was rejected by safety validation.';
    const sanitizedError = sanitizeErrorText(rawError);

    return (
      <div id="querypilot-results-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Results</h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{timestampText}</span>
          </div>
        </div>
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-5 text-rose-900 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <h3 className="text-sm font-bold">Query Execution Failure / Safety Block</h3>
          </div>
          <p className="text-xs leading-relaxed text-rose-700 font-mono bg-white/60 p-3 rounded-xl border border-rose-100">
            {sanitizedError}
          </p>
        </div>
      </div>
    );
  }

  // 5. Successful Database Execution
  // Dynamic Insight Summary text
  const dynamicInsightText = datasetAnalysis.summary || response.explanation || 'Query executed successfully.';

  return (
    <div id="querypilot-results-section" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Results</h2>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>{timestampText}</span>
        </div>
      </div>

      {/* Main Results Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-5">
        {/* Dynamic Data-Driven Insight Summary Banner */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
          <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm font-semibold text-slate-900 leading-relaxed">
            {dynamicInsightText}
          </div>
        </div>

        {/* Two-Column Layout: Table (Left) + Smart Visualization (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Query Results Table (7 cols) */}
          <div className="lg:col-span-7 border border-slate-200/80 rounded-xl p-4 bg-white flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                  Query Results ({rows.length} {rows.length === 1 ? 'row' : 'rows'})
                </h4>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-100"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>

              {/* Table search filter if rows > 5 */}
              {rows.length > 5 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search results..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Scrollable Data Table */}
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold tracking-wider uppercase text-[11px] bg-slate-50/50 sticky top-0">
                      <th className="pb-2.5 pt-2 px-2 font-semibold">#</th>
                      {columns.map((col, idx) => (
                        <th
                          key={idx}
                          onClick={() => toggleSort(col)}
                          className="pb-2.5 pt-2 px-3 font-semibold cursor-pointer hover:text-indigo-600 transition whitespace-nowrap"
                        >
                          {formatColumnLabel(col)}
                          {sortCol === col && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="py-6 text-center text-slate-400 text-xs">
                          No matching rows found
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row, rowIdx) => {
                        const globalIndex = (currentPage - 1) * pageSize + rowIdx + 1;
                        return (
                          <tr key={rowIdx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-2 font-medium text-slate-400 text-[11px]">
                              {globalIndex}
                            </td>
                            {columns.map((col, colIdx) => (
                              <td
                                key={colIdx}
                                className={`py-2.5 px-3 whitespace-nowrap ${
                                  colIdx === 0 ? 'font-semibold text-slate-900' : ''
                                }`}
                              >
                                {formatCellValue(row[col], col)}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2 text-xs text-slate-500">
                <span>
                  Page {currentPage} of {totalPages} ({filteredRows.length} items)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Smart Visualization (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <ErrorBoundary inline>
              <SmartVisualization
                rows={rows}
                columns={columns}
                question={response.question}
                rowCount={response.execution.rowCount}
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* Collapsible Accordion: Generated Query & Telemetry */}
        <div className="border-t border-slate-100 pt-3">
          <button
            id="toggle-show-query-button"
            type="button"
            onClick={() => setIsQueryExpanded(!isQueryExpanded)}
            className="w-full flex items-center justify-between text-xs sm:text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors py-1 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-slate-500" />
              <span>
                {isQueryExpanded ? 'Hide generated query' : 'Show generated query'}
              </span>
            </div>
            {isQueryExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isQueryExpanded && (
            <div className="mt-3 space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Read-Only AST Validated (SELECT)
                </span>
                <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono">
                  {response.execution.rowCount} row(s) returned
                </span>
                <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono">
                  {response.execution.executionTimeMs}ms execution
                </span>
                {response.selfCorrected && (
                  <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">
                    Self-corrected (retry {response.retryCount})
                  </span>
                )}
              </div>

              <div className="relative group rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-inner">
                <button
                  type="button"
                  onClick={() => handleCopySql(response.formattedSql || response.generatedSql)}
                  className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition border border-slate-700 cursor-pointer"
                  title="Copy SQL"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <pre className="text-slate-200 leading-relaxed pr-16 whitespace-pre-wrap">
                  {response.formattedSql || response.generatedSql}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function sanitizeErrorText(errText: string): string {
  if (!errText) return 'An error occurred during query execution.';
  return errText
    .replace(/:\/\/[^:]+:[^@]+@/, '://****:****@')
    .replace(/at\s+[\s\S]+/g, '')
    .trim();
}
