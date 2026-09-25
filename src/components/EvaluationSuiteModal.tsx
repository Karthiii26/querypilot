import React, { useState } from 'react';
import {
  X,
  Play,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { EvaluationMetricReport } from '../types';

interface EvaluationSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunBenchmark: () => Promise<EvaluationMetricReport>;
  lastReport: EvaluationMetricReport | null;
  isRunning: boolean;
}

export const EvaluationSuiteModal: React.FC<EvaluationSuiteModalProps> = ({
  isOpen,
  onClose,
  onRunBenchmark,
  lastReport,
  isRunning
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');

  if (!isOpen) return null;

  const categories = [
    'all',
    'basic',
    'filtering',
    'aggregation',
    'ranking',
    'join',
    'multi-table',
    'date-analysis',
    'comparison',
    'ambiguity',
    'safety'
  ];

  const filteredResults = (lastReport?.results || []).filter(r => {
    if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
    if (filterStatus === 'passed' && !r.passed) return false;
    if (filterStatus === 'failed' && r.passed) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Automated 32-Test Evaluation Benchmark
              </h2>
              <p className="text-xs text-slate-500">
                End-to-end quantitative validation across 10 query categories & safety constraints
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRunBenchmark}
              disabled={isRunning}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition shadow-xs"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Running Tests...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Benchmark</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 7 Primary Metrics Cards */}
          {lastReport ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  SQL Success Rate
                </span>
                <span className="text-xl font-bold text-indigo-600 mt-1 block">
                  {lastReport.sqlSuccessRate}%
                </span>
                <span className="text-[10px] text-slate-400">Valid execution</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Answer Correctness
                </span>
                <span className="text-xl font-bold text-emerald-600 mt-1 block">
                  {lastReport.answerCorrectnessRate}%
                </span>
                <span className="text-[10px] text-slate-400">Grounded facts</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Schema Relevance
                </span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">
                  {lastReport.schemaRetrievalRelevance}%
                </span>
                <span className="text-[10px] text-slate-400">RAG precision</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Ambiguity Accuracy
                </span>
                <span className="text-xl font-bold text-amber-600 mt-1 block">
                  {lastReport.ambiguityAccuracy}%
                </span>
                <span className="text-[10px] text-slate-400">Flagged properly</span>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <span className="text-[11px] font-semibold text-emerald-800 block truncate">
                  Safety Rejection
                </span>
                <span className="text-xl font-bold text-emerald-700 mt-1 block">
                  {lastReport.safetyRejectionRate}%
                </span>
                <span className="text-[10px] text-emerald-600">Unsafe ops blocked</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Average Latency
                </span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">
                  {lastReport.averageLatencyMs}ms
                </span>
                <span className="text-[10px] text-slate-400">End-to-end</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Self-Correction
                </span>
                <span className="text-xl font-bold text-indigo-600 mt-1 block">
                  {lastReport.selfCorrectionSuccessRate}%
                </span>
                <span className="text-[10px] text-slate-400">Auto-recovery</span>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center bg-slate-50/50">
              <BarChart3 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                Click "Execute Benchmark" to run all 32 test cases
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Validates basic queries, filtering, aggregation, ranking, joins, multi-table joins, dates, comparisons, ambiguity detection, and SQL safety enforcement.
              </p>
            </div>
          )}

          {/* Test Case Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Category Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize shrink-0 transition ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1.5 shrink-0">
              {(['all', 'passed', 'failed'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition ${
                    filterStatus === st
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Test Case Table */}
          {lastReport && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold">Status</th>
                    <th className="px-3.5 py-2.5 font-semibold">Test ID</th>
                    <th className="px-3.5 py-2.5 font-semibold">Category</th>
                    <th className="px-3.5 py-2.5 font-semibold">Natural Language Query</th>
                    <th className="px-3.5 py-2.5 font-semibold">Latency</th>
                    <th className="px-3.5 py-2.5 font-semibold">Outcome Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map(t => (
                    <tr key={t.testId} className="hover:bg-slate-50/70 transition">
                      <td className="px-3.5 py-2.5">
                        {t.passed ? (
                          <div className="flex items-center space-x-1 text-emerald-600 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>PASS</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-rose-600 font-semibold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>FAIL</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-500 text-[11px]">
                        {t.testId}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 uppercase">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-800">
                        {t.question}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-500">
                        {t.latencyMs}ms
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 font-mono text-[11px]">
                        {t.notes || t.error || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
