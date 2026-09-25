import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Table as TableIcon,
  Search,
  Zap,
  Info
} from 'lucide-react';
import { ChartDataItem, DatasetAnalysis, VisualizationType } from './types';
import { formatColumnLabel, formatNumber } from './formatters';

interface ChartRendererProps {
  type: VisualizationType;
  rows: Record<string, any>[];
  analysis: DatasetAnalysis;
}

const PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316'  // Orange
];

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  type,
  rows,
  analysis
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Prepare chart data items from analysis
  const chartData: ChartDataItem[] = React.useMemo(() => {
    if (!rows || rows.length === 0) return [];

    const catCol = analysis.primaryCategoryCol;
    const numCol = analysis.primaryNumericCol;

    if (!catCol && !numCol) return [];

    const labelColName = catCol?.name || analysis.columns[0]?.name || 'Item';
    const valColName = numCol?.name || analysis.columns.find((c) => c.role === 'numeric')?.name || '';

    // Take top 15 rows max for chart clarity
    return rows.slice(0, 15).map((row, idx) => {
      const fullLabel = String(row[labelColName] ?? `Item ${idx + 1}`);
      const rawVal = valColName ? Number(row[valColName]) : 1;
      const numVal = isNaN(rawVal) ? 0 : rawVal;

      const isCurr = numCol?.isCurrency || false;
      const isPct = numCol?.isPercentage || false;
      const formattedValue = formatNumber(numVal, isCurr, isPct);

      let shortLabel = fullLabel;
      if (shortLabel.length > 14) {
        shortLabel = shortLabel.slice(0, 12) + '…';
      }

      return {
        label: shortLabel,
        fullName: fullLabel,
        value: numVal,
        formattedValue,
        rawRow: row
      };
    });
  }, [rows, analysis]);

  // 1. KPI Stat Card
  if (type === 'kpi') {
    const kpi = analysis.kpiData || {
      label: 'Total Result',
      value: rows.length,
      colName: 'count',
      subtext: 'Single aggregate metric'
    };

    return (
      <div className="bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 rounded-2xl border border-indigo-100 p-8 flex flex-col justify-center items-center text-center shadow-xs space-y-3 relative overflow-hidden min-h-[260px]">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
        <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md mb-1">
          <Zap className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono">
            {kpi.label}
          </p>
          <p className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            {kpi.value}
          </p>
        </div>
        <p className="text-xs text-slate-500 max-w-xs font-medium">
          {kpi.subtext || analysis.summary}
        </p>
      </div>
    );
  }

  // 2. No Data State
  if (type === 'no-data' || chartData.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 text-center space-y-3 min-h-[260px] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-200/60 text-slate-400 flex items-center justify-center">
          <Search className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">No results to visualize</h4>
        <p className="text-xs text-slate-500 max-w-xs">
          The query returned 0 rows or contains no numeric metrics to plot.
        </p>
      </div>
    );
  }

  // 3. Table Only Recommendation
  if (type === 'table-only') {
    return (
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-6 text-center space-y-3 min-h-[260px] flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <TableIcon className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">Data Table View</h4>
        <p className="text-xs text-slate-500 max-w-sm">
          This result contains raw records best viewed in the Query Results table on the left.
        </p>
      </div>
    );
  }

  // Max value for scaling chart axes
  const maxVal = Math.max(...chartData.map((d) => d.value), 1);
  const numMetricName = formatColumnLabel(analysis.primaryNumericCol?.name || 'Metric');

  // 4. Vertical Bar Chart
  if (type === 'bar') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-700">{numMetricName}</span>
          <span>{chartData.length} categories</span>
        </div>

        <div className="relative h-56 w-full flex flex-col justify-end pt-4 pb-2 bg-white rounded-xl border border-slate-100 p-3">
          <div className="relative flex-1 w-full flex items-end justify-around px-2 border-b border-slate-200">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-slate-200 w-full" />
              <div className="border-b border-slate-200 w-full" />
              <div className="border-b border-slate-200 w-full" />
              <div className="border-b border-slate-200 w-full" />
            </div>

            {chartData.map((item, idx) => {
              const heightPct = Math.max(8, Math.round((item.value / maxVal) * 100));
              const isHovered = hoveredIdx === idx;
              const barColor = PALETTE[idx % PALETTE.length];

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="h-full flex items-end justify-center z-10 flex-1 mx-1 group relative cursor-pointer"
                >
                  <div
                    style={{ height: `${heightPct}%`, backgroundColor: barColor }}
                    className={`w-full max-w-[42px] rounded-t-md transition-all duration-200 ${
                      isHovered ? 'brightness-110 scale-y-105 shadow-md' : 'opacity-90'
                    }`}
                  />

                  {/* Dynamic Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-10 z-30 bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg shadow-xl pointer-events-none whitespace-nowrap font-sans font-medium animate-in fade-in zoom-in-95 duration-150">
                      <span className="font-bold">{item.fullName}</span>: {item.formattedValue}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div className="flex justify-around pt-2 text-[10px] text-slate-500 font-medium">
            {chartData.map((item, idx) => (
              <div
                key={idx}
                className="flex-1 text-center truncate px-0.5"
                title={item.fullName}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 5. Horizontal Bar Chart (Ideal for ranking / long category names)
  if (type === 'horizontal-bar') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
          <span className="font-semibold text-slate-700">{numMetricName}</span>
          <span>Top {chartData.length} items</span>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {chartData.map((item, idx) => {
            const widthPct = Math.max(6, Math.round((item.value / maxVal) * 100));
            const barColor = PALETTE[idx % PALETTE.length];
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="space-y-1 group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className="font-medium text-slate-700 truncate max-w-[180px] group-hover:text-indigo-600 transition"
                    title={item.fullName}
                  >
                    {item.fullName}
                  </span>
                  <span className="font-mono text-slate-900 font-semibold text-xs ml-2">
                    {item.formattedValue}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${widthPct}%`, backgroundColor: barColor }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHovered ? 'brightness-110 shadow-sm' : 'opacity-90'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 6. Line / Area Chart (Ideal for time series)
  if (type === 'line') {
    const points = chartData.map((item, idx) => {
      const x = (idx / Math.max(1, chartData.length - 1)) * 100;
      const y = 100 - (item.value / maxVal) * 80 - 10;
      return { x, y, item };
    });

    const pathD = points.reduce(
      (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
      ''
    );
    const areaD = `${pathD} L 100 100 L 0 100 Z`;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-700">Trend over time</span>
          <span>{chartData.length} points</span>
        </div>

        <div className="relative h-52 w-full bg-white rounded-xl border border-slate-100 p-3 flex flex-col justify-between">
          <svg className="w-full h-40 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Filled area */}
            <path d={areaD} fill="url(#lineGrad)" />

            {/* Stroke path */}
            <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data point circles */}
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={hoveredIdx === idx ? 4 : 2.5}
                fill={hoveredIdx === idx ? '#4f46e5' : '#ffffff'}
                stroke="#6366f1"
                strokeWidth="2"
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>

          {/* Active tooltip hover display */}
          {hoveredIdx !== null && points[hoveredIdx] && (
            <div className="text-center text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg py-1 px-2 transition">
              {points[hoveredIdx].item.fullName}: {points[hoveredIdx].item.formattedValue}
            </div>
          )}

          {/* X Axis labels */}
          <div className="flex justify-between pt-1 text-[10px] text-slate-400 font-medium">
            <span>{chartData[0]?.label}</span>
            {chartData.length > 2 && (
              <span>{chartData[Math.floor(chartData.length / 2)]?.label}</span>
            )}
            <span>{chartData[chartData.length - 1]?.label}</span>
          </div>
        </div>
      </div>
    );
  }

  // 7. Donut / Pie Chart (Ideal for small category sets e.g. status)
  if (type === 'donut') {
    const totalVal = chartData.reduce((acc, d) => acc + d.value, 0) || 1;

    let cumulativePct = 0;
    const slices = chartData.map((item, idx) => {
      const pct = item.value / totalVal;
      const startAngle = cumulativePct * 360;
      cumulativePct += pct;
      const endAngle = cumulativePct * 360;
      const color = PALETTE[idx % PALETTE.length];
      return { item, pct, startAngle, endAngle, color };
    });

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-700">Distribution</span>
          <span>Total: {formatNumber(totalVal)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-white rounded-xl border border-slate-100 p-4">
          {/* Donut graphic */}
          <div className="sm:col-span-5 flex justify-center relative">
            <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
              {slices.map((slice, idx) => {
                const strokeDasharray = `${slice.pct * 100} ${100 - slice.pct * 100}`;
                const strokeDashoffset = 100 - (slices.slice(0, idx).reduce((acc, s) => acc + s.pct, 0) * 100);

                return (
                  <circle
                    key={idx}
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="6"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
              <span className="text-sm font-extrabold text-slate-900">{formatNumber(totalVal)}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="sm:col-span-7 space-y-2 text-xs">
            {slices.map((slice, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg transition ${
                    isHovered ? 'bg-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="truncate font-medium text-slate-700" title={slice.item.fullName}>
                      {slice.item.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-900 shrink-0 ml-2">
                    <span className="font-semibold">{slice.item.formattedValue}</span>
                    <span className="text-slate-400 font-sans text-[11px]">({Math.round(slice.pct * 100)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 8. Histogram
  if (type === 'histogram') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-700">Numeric Distribution</span>
          <span>{chartData.length} bins</span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {chartData.map((item, idx) => {
            const widthPct = Math.max(8, Math.round((item.value / maxVal) * 100));
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{item.fullName}</span>
                  <span className="font-mono text-slate-900 font-semibold">{item.formattedValue}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${widthPct}%` }} className="h-full bg-indigo-500 rounded-full" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
