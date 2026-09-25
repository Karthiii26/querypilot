import React from 'react';
import { Loader2 } from 'lucide-react';

export const ResultsLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse" id="results-loading-skeleton">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 bg-slate-200 rounded-md" />
        <div className="h-4 w-20 bg-slate-200 rounded-md" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-5 shadow-xs">
        {/* Banner skeleton */}
        <div className="h-12 bg-slate-100 rounded-xl w-full flex items-center px-4 gap-3">
          <div className="h-6 w-6 rounded-full bg-slate-200 shrink-0" />
          <div className="h-4 bg-slate-200 rounded-md flex-1" />
        </div>

        {/* Two column grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="space-y-2">
              <div className="h-8 bg-slate-200/70 rounded" />
              <div className="h-6 bg-slate-100 rounded" />
              <div className="h-6 bg-slate-100 rounded" />
              <div className="h-6 bg-slate-100 rounded" />
              <div className="h-6 bg-slate-100 rounded" />
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between min-h-[220px]">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-32 bg-slate-200/60 rounded-xl flex items-end justify-around p-3 gap-2">
              <div className="h-24 w-8 bg-slate-300/80 rounded-t" />
              <div className="h-16 w-8 bg-slate-300/80 rounded-t" />
              <div className="h-28 w-8 bg-slate-300/80 rounded-t" />
              <div className="h-12 w-8 bg-slate-300/80 rounded-t" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
