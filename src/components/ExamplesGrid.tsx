import React from 'react';
import {
  BarChart3,
  Users,
  TrendingUp,
  Package,
  Calendar,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';

interface ExamplesGridProps {
  onSelectExample: (question: string) => void;
  disabled?: boolean;
}

export const ExamplesGrid: React.FC<ExamplesGridProps> = ({
  onSelectExample,
  disabled
}) => {
  const examples = [
    {
      id: 'ex-1',
      question: 'What are the top 10 records by value?',
      icon: BarChart3
    },
    {
      id: 'ex-2',
      question: 'How many records are there?',
      icon: Users
    },
    {
      id: 'ex-3',
      question: 'Which category has the highest average value?',
      icon: TrendingUp
    },
    {
      id: 'ex-4',
      question: 'Show me the latest records',
      icon: Package
    },
    {
      id: 'ex-5',
      question: "Compare this month's results with last month",
      icon: Calendar
    },
    {
      id: 'ex-6',
      question: 'Show all records with value above 1000',
      icon: MoreHorizontal
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">
        Try these examples
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {examples.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`example-card-${item.id}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelectExample(item.question)}
              className="bg-white hover:bg-slate-50/80 active:bg-slate-100 border border-slate-200/80 hover:border-indigo-300 rounded-xl p-3.5 flex items-center justify-between text-left transition-all shadow-xs group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-indigo-900 leading-snug line-clamp-2">
                  {item.question}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
