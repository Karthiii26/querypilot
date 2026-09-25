import React, { useState } from 'react';
import { Sparkles, CornerDownLeft } from 'lucide-react';

interface QueryInputSectionProps {
  onExecuteQuery: (question: string) => void;
  isLoading: boolean;
}

const EXAMPLE_QUERIES = [
  'What are the top 10 products by revenue?',
  'Which customers spent the most?',
  'What was our revenue last month?',
  'Which products have high sales but low ratings?',
  "Compare this month's revenue with last month.",
  'How many orders were above 1000?',
  'Who are our best customers?'
];

export const QueryInputSection: React.FC<QueryInputSectionProps> = ({
  onExecuteQuery,
  isLoading
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isLoading) return;
    onExecuteQuery(inputVal.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSample = (sample: string) => {
    setInputVal(sample);
    onExecuteQuery(sample);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          QueryPilot
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Ask your database anything in plain English.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your data..."
            rows={3}
            disabled={isLoading}
            className="w-full resize-none rounded-xl border border-slate-300 p-4 pr-24 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-3 focus:ring-indigo-600/10 text-base leading-relaxed transition"
          />

          <div className="absolute right-3 bottom-3.5">
            <button
              type="submit"
              disabled={!inputVal.trim() || isLoading}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Ask</span>
                  <CornerDownLeft className="w-3.5 h-3.5 text-indigo-200 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Example Query Pills */}
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Example Queries
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((sampleQuery, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sampleQuery)}
                disabled={isLoading}
                className="text-left px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-xs font-medium text-slate-700 hover:text-indigo-900 transition disabled:opacity-50"
              >
                {sampleQuery}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
