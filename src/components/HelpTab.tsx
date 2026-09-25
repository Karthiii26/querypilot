import React from 'react';
import { HelpCircle, Shield, Zap, Sparkles, BookOpen, CheckCircle } from 'lucide-react';

export const HelpTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">How to Use QueryPilot</h2>
        <p className="text-sm text-slate-500">
          QueryPilot translates your plain English business questions into verified SQL and interactive data visualizations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <h3 className="text-sm font-bold text-slate-900">Ask in Plain English</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Type questions like <em>"What were our top 5 revenue products?"</em> or <em>"Compare this month's revenue with last month."</em>
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2.5">
          <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <h3 className="text-sm font-bold text-slate-900">Verified Read-Only SQL</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every query is parsed with an AST parser to ensure it is strictly read-only (`SELECT`), protecting your database from accidental modifications.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <h3 className="text-sm font-bold text-slate-900">Automated Insights & Charts</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            QueryPilot analyzes the returned tabular data, generates an executive summary insight, and automatically renders a chart visualization.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          Enterprise Safety Guarantees
        </h3>
        <ul className="space-y-2 text-xs text-slate-600">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span><strong>Zero Data Exposure:</strong> Only database schemas and column names are sent to Gemini for SQL drafting — your row data never leaves your local PostgreSQL instance.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span><strong>Read-Only Transactions:</strong> Queries are executed inside strict read-only transactions with query timeouts to prevent locks.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span><strong>Self-Correction Feedback Loop:</strong> If the database reports a column error, QueryPilot feeds the error back to Gemini to self-correct automatically.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
