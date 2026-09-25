import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  BarChartHorizontal,
  Table as TableIcon,
  Zap,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { analyzeDataset } from './detectVisualization';
import { ChartRenderer } from './ChartRenderer';
import { VisualizationType } from './types';
import { formatColumnLabel } from './formatters';

interface SmartVisualizationProps {
  rows: Record<string, any>[];
  columns: string[];
  question?: string;
  rowCount?: number;
}

const TYPE_CONFIG: Record<
  VisualizationType,
  { label: string; icon: React.FC<{ className?: string }> }
> = {
  kpi: { label: 'Metric', icon: Zap },
  bar: { label: 'Bar', icon: BarChart3 },
  'horizontal-bar': { label: 'Ranking', icon: BarChartHorizontal },
  line: { label: 'Trend', icon: TrendingUp },
  donut: { label: 'Pie', icon: PieChart },
  histogram: { label: 'Dist.', icon: Layers },
  'table-only': { label: 'Table', icon: TableIcon },
  'no-data': { label: 'No Data', icon: TableIcon }
};

export const SmartVisualization: React.FC<SmartVisualizationProps> = ({
  rows,
  columns,
  question = '',
  rowCount
}) => {
  // Analyze dataset to determine recommended chart and available chart types
  const analysis = React.useMemo(() => {
    return analyzeDataset(rows, columns, question);
  }, [rows, columns, question]);

  const [selectedType, setSelectedType] = useState<VisualizationType>(
    analysis.recommendedType
  );

  // Sync selectedType when analysis updates
  useEffect(() => {
    setSelectedType(analysis.recommendedType);
  }, [analysis]);

  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 text-center space-y-3">
        <h4 className="text-sm font-bold text-slate-800">No results to visualize</h4>
        <p className="text-xs text-slate-500">
          Query returned 0 rows from the database.
        </p>
      </div>
    );
  }

  // Filter available toggle options (excluding 'no-data')
  const toggleOptions = analysis.availableTypes.filter((t) => t !== 'no-data');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Top Card Header with Title + Chart Type Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Dynamic Visualization</span>
            {analysis.primaryNumericCol && (
              <span className="text-[11px] font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                {formatColumnLabel(analysis.primaryNumericCol.name)}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Auto-detected chart based on returned schema & data shape
          </p>
        </div>

        {/* Chart Switcher Button Tabs */}
        {toggleOptions.length > 1 && (
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 shadow-xs">
            {toggleOptions.map((typeKey) => {
              const cfg = TYPE_CONFIG[typeKey] || { label: typeKey, icon: BarChart3 };
              const IconComp = cfg.icon;
              const isActive = selectedType === typeKey;

              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setSelectedType(typeKey)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                  title={`Switch to ${cfg.label} chart`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart Body Renderer */}
      <ChartRenderer type={selectedType} rows={rows} analysis={analysis} />
    </div>
  );
};
