import React from 'react';
import {
  Database,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Clock,
  Rows3,
  AlertTriangle,
  ExternalLink,
  Hash,
  Server,
  Globe,
  KeyRound,
  Zap
} from 'lucide-react';
import { DatabaseStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface SettingsTabProps {
  dbStatus: DatabaseStatus | null;
  onOpenConnectModal: () => void;
  onRefreshSchema: () => void;
  isRefreshing: boolean;
}

function extractProjectRef(url: string | null): string | null {
  if (!url) return null;
  const clean = url.trim();
  const match = clean.match(/([a-z0-9]{20})/i);
  if (match) return match[1];
  const stripped = clean.replace(/^https?:\/\//, '').replace(/\.supabase\.co.*$/, '').trim();
  return stripped.length >= 5 ? stripped : null;
}

function getSupabaseDashboardUrl(url: string | null): string {
  const ref = extractProjectRef(url);
  if (ref) return `https://supabase.com/dashboard/project/${ref}`;
  return 'https://supabase.com/dashboard';
}

function getFormattedProjectHost(url: string | null): string {
  const ref = extractProjectRef(url);
  if (ref) return `${ref}.supabase.co`;
  if (!url) return 'Supabase Cloud PostgreSQL';
  return url.replace(/^https?:\/\//, '');
}

const StatusBadge: React.FC<{ connected: boolean }> = ({ connected }) => (
  <span
    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
      connected
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
        : 'text-amber-700 bg-amber-50 border-amber-200/60'
    }`}
  >
    {connected ? (
      <>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Connected
      </>
    ) : (
      <>
        <AlertTriangle className="w-3 h-3 text-amber-500" />
        Not Connected
      </>
    )}
  </span>
);

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}> = ({ icon, label, value, mono }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className="text-slate-400">{icon}</span>
      <span className="font-medium text-slate-700">{label}</span>
    </div>
    <span className={`text-xs font-semibold text-slate-900 ${mono ? 'font-mono bg-slate-100 px-2 py-0.5 rounded-md' : ''}`}>
      {value}
    </span>
  </div>
);

export const SettingsTab: React.FC<SettingsTabProps> = ({
  dbStatus,
  onOpenConnectModal,
  onRefreshSchema,
  isRefreshing
}) => {
  const { preferences } = useAuth();
  const hasConnectedDb = preferences.hasConnectedDb;
  const projectRef = extractProjectRef(preferences.lastProjectUrl);
  const dashboardUrl = getSupabaseDashboardUrl(preferences.lastProjectUrl);
  const projectHost = getFormattedProjectHost(preferences.lastProjectUrl);

  const llmProvider = dbStatus?.llmProvider || 'gemini';
  const llmLabel =
    llmProvider === 'gemini' ? 'Google Gemini 2.5 Flash' :
    llmProvider === 'openai' ? 'OpenAI GPT-4o' :
    llmProvider === 'deterministic' ? 'Deterministic (No AI)' :
    llmProvider;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settings &amp; Configuration</h2>
        <p className="text-sm text-slate-500 mt-1">
          Connected database details, project credentials, and AI guardrails.
        </p>
      </div>

      {/* Query Database Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Connected Database</h3>
              <p className="text-xs text-slate-500">Live PostgreSQL instance used for schema discovery &amp; query processing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge connected={hasConnectedDb} />
            {hasConnectedDb && (
              <button
                type="button"
                onClick={onRefreshSchema}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition cursor-pointer"
            >
              {hasConnectedDb ? 'Switch DB' : 'Connect DB'}
            </button>
          </div>
        </div>

        {hasConnectedDb ? (
          <div className="divide-y divide-slate-100">
            <InfoRow
              icon={<Globe className="w-3.5 h-3.5" />}
              label="Supabase Host"
              value={projectHost}
              mono
            />
            {projectRef && (
              <InfoRow
                icon={<KeyRound className="w-3.5 h-3.5" />}
                label="Project Ref ID"
                value={projectRef}
                mono
              />
            )}
            <InfoRow
              icon={<Hash className="w-3.5 h-3.5" />}
              label="Database Name"
              value={dbStatus?.databaseName || 'postgres'}
              mono
            />
            <InfoRow
              icon={<Server className="w-3.5 h-3.5" />}
              label="Connection Provider"
              value={dbStatus?.connectionLabel || dbStatus?.connectionType || 'Supabase Cloud PostgreSQL'}
            />
            <InfoRow icon={<Database className="w-3.5 h-3.5" />} label="Dialect & Port" value="postgresql : 6543 (Pooler)" mono />
            <InfoRow
              icon={<Rows3 className="w-3.5 h-3.5" />}
              label="Discovered Tables"
              value={`${dbStatus?.tableCount ?? 0} tables`}
            />
            <InfoRow
              icon={<Rows3 className="w-3.5 h-3.5" />}
              label="Total Rows Discovered"
              value={(dbStatus?.totalRows ?? 0).toLocaleString()}
            />
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-center space-y-2">
            <p className="text-xs text-slate-600 font-medium">
              No database connected yet. Connect your Supabase project URL &amp; password to view live table details.
            </p>
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" /> Connect Supabase Project
            </button>
          </div>
        )}

        {hasConnectedDb && (
          <div className="pt-2">
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Supabase Project Dashboard ({projectRef || 'Supabase'})
            </a>
          </div>
        )}
      </div>

      {/* AI Assistant & Guardrails */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI Assistant &amp; Execution Guardrails</h3>
            <p className="text-xs text-slate-500">Settings governing SQL query generation and execution safety</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <InfoRow icon={<Sliders className="w-3.5 h-3.5" />} label="AI Model Provider" value={llmLabel} />
          <InfoRow
            icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
            label="Safety Guardrail"
            value={
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                <CheckCircle2 className="w-3 h-3" /> SELECT-only enforced
              </span>
            }
          />
          <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Query Timeout" value="10,000 ms" mono />
          <InfoRow icon={<Rows3 className="w-3.5 h-3.5" />} label="Max Results Limit" value="1,000 rows" mono />
        </div>
      </div>
    </div>
  );
};
