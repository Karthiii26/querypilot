import React from 'react';
import { HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { QueryUnderstanding } from '../types';

interface ClarificationCardProps {
  understanding: QueryUnderstanding;
  onSelectOption: (option: string) => void;
  isLoading: boolean;
}

export const ClarificationCard: React.FC<ClarificationCardProps> = ({
  understanding,
  onSelectOption,
  isLoading
}) => {
  const promptText =
    understanding.clarificationPrompt ||
    'This question can be interpreted in several different ways. How would you like to define it?';

  const options = understanding.clarificationOptions || [
    'Highest total spending (lifetime revenue)',
    'Most completed orders (order count)',
    'Highest average order value'
  ];

  return (
    <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-5 shadow-xs">
      <div className="flex items-start space-x-3.5">
        <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-amber-950">
              Query Disambiguation Needed
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900">
              Ambiguity Flagged
            </span>
          </div>

          <p className="text-xs text-amber-900/90 mt-1 mb-3.5 leading-relaxed">
            {promptText}
          </p>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              Choose an interpretation to generate precise SQL:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectOption(opt)}
                  disabled={isLoading}
                  className="flex items-center justify-between p-3 rounded-lg border border-amber-300 bg-white hover:bg-amber-100/50 text-slate-800 text-xs font-medium text-left transition shadow-2xs group"
                >
                  <span className="pr-2">{opt}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
