import React from 'react';
import {
  Brain,
  Search,
  Code2,
  ShieldCheck,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { PipelineStageLog } from '../types';

interface PipelineTrackerProps {
  stages: PipelineStageLog[];
  totalLatencyMs: number;
  selfCorrected?: boolean;
}

const STAGE_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  understanding: { label: 'Query Understanding', icon: Brain },
  retrieval: { label: 'Schema RAG', icon: Search },
  generation: { label: 'SQL Generation', icon: Code2 },
  validation: { label: 'AST Validation', icon: ShieldCheck },
  execution: { label: 'Safe Execution', icon: Play },
  correction: { label: 'Self-Correction', icon: RotateCcw },
  analysis: { label: 'Result Analysis', icon: Sparkles }
};

export const PipelineTracker: React.FC<PipelineTrackerProps> = ({
  stages,
  totalLatencyMs,
  selfCorrected
}) => {
  if (!stages || stages.length === 0) return null;

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Pipeline Execution Telemetry
          </span>
          {selfCorrected && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1">
              <RotateCcw className="w-3 h-3" />
              <span>Self-Corrected</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 text-xs font-mono text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Total: {totalLatencyMs}ms</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {stages.map((stg, idx) => {
          const config = STAGE_CONFIG[stg.stage] || {
            label: stg.stage,
            icon: Brain
          };
          const IconComponent = config.icon;
          const isSuccess = stg.status === 'success' || stg.status === 'corrected';
          const isFailed = stg.status === 'failed';

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-left transition ${
                isFailed
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : stg.status === 'corrected'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <IconComponent className={`w-3.5 h-3.5 ${
                  isFailed ? 'text-rose-500' : stg.status === 'corrected' ? 'text-amber-600' : 'text-indigo-600'
                }`} />
                {isFailed ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                )}
              </div>
              <div className="text-[11px] font-medium leading-tight truncate">
                {config.label}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                {stg.durationMs}ms
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
