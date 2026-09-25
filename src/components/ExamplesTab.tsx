import React from 'react';
import { Lightbulb, ArrowRight, BarChart3, Users, DollarSign, Package, Calendar, Award } from 'lucide-react';

interface ExamplesTabProps {
  onSelectExample: (question: string) => void;
}

export const ExamplesTab: React.FC<ExamplesTabProps> = ({ onSelectExample }) => {
  const categories = [
    {
      name: 'Aggregation & Metrics',
      icon: DollarSign,
      items: [
        'What are the top 10 records by value?',
        'How many total records exist across our primary tables?',
        'Compare this month\'s results with last month',
        'Show all records with value above 1000'
      ]
    },
    {
      name: 'Segmentation & Breakdown',
      icon: Users,
      items: [
        'Which category has the highest average value?',
        'Show the distribution of records grouped by status',
        'What is the average metric breakdown by category?'
      ]
    },
    {
      name: 'Time-Series & Recency',
      icon: Package,
      items: [
        'Show me the latest records created in the system',
        'List records modified in the last 30 days',
        'What is the daily volume trend for the current month?'
      ]
    },
    {
      name: 'Comparative & Ranking',
      icon: Calendar,
      items: [
        'Show the top 5 categories ordered by total volume',
        'Which records fall below the average threshold?',
        'Show records with high volume but low status score'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Curated Analytical Examples</h2>
        <p className="text-sm text-slate-500">
          Click any analytical question to execute it directly against the database with verified SQL and automated visualization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {categories.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 text-indigo-600 font-semibold text-sm">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <span>{cat.name}</span>
              </div>

              <div className="space-y-2 pt-1">
                {cat.items.map((q, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => onSelectExample(q)}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-200 transition flex items-center justify-between text-xs sm:text-sm font-medium text-slate-700 hover:text-indigo-900 group cursor-pointer"
                  >
                    <span className="pr-2">{q}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
