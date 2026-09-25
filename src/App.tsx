import React, { useState, useEffect } from 'react';
import {
  Search,
  Send,
  Database,
  ChevronDown,
  Loader2,
  Menu,
  X
} from 'lucide-react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { ExploreYourData } from './components/ExploreYourData';
import { ResultsSection } from './components/ResultsSection';
import { HistoryTab } from './components/HistoryTab';
import { DatabaseTab } from './components/DatabaseTab';
import { SettingsTab } from './components/SettingsTab';
import { HelpTab } from './components/HelpTab';
import { ClarificationCard } from './components/ClarificationCard';
import { SchemaViewerModal } from './components/SchemaViewerModal';
import { ConnectDatabaseModal } from './components/ConnectDatabaseModal';
import { EvaluationSuiteModal } from './components/EvaluationSuiteModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Logo } from './components/Logo';
import { OnboardingConnectModal } from './components/OnboardingConnectModal';
import {
  DatabaseSchemaInfo,
  DatabaseStatus,
  EvaluationMetricReport,
  QueryPipelineResponse
} from './types';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex flex-col items-center justify-center text-slate-900 font-sans animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse">
            <Logo className="w-12 h-12 drop-shadow-sm" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium animate-fade-slide-up delay-200">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Connecting to QueryPilot...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <Dashboard />;
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ask');
  const [inputQuestion, setInputQuestion] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Database state
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [schema, setSchema] = useState<DatabaseSchemaInfo | null>(null);
  const [isRefreshingSchema, setIsRefreshingSchema] = useState(false);

  const { isNewLogin, resetNewLogin, user: authUser, preferences, updatePreferences } = useAuth();

  // Query execution & history state
  const [currentResponse, setCurrentResponse] = useState<QueryPipelineResponse | null>(null);
  const [history, setHistory] = useState<QueryPipelineResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [relativeTime, setRelativeTime] = useState('Just now');

  // Modals state
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationMetricReport | null>(null);
  const [isRunningEvaluation, setIsRunningEvaluation] = useState(false);

  // Initial load and user change reset
  useEffect(() => {
    setHistory([]);
    setCurrentResponse(null);
    fetchDatabaseStatus();
    fetchSchema(true);
  }, [authUser?.id]);

  const fetchDatabaseStatus = async () => {
    try {
      const res = await fetch('/api/database/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('Could not load database status:', err);
    }
  };

  const fetchSchema = async (force: boolean = false) => {
    setIsRefreshingSchema(true);
    try {
      const res = await fetch(`/api/schema?refresh=${force}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSchema(data);
      }
    } catch (err) {
      console.warn('Could not load schema:', err);
    } finally {
      setIsRefreshingSchema(false);
    }
  };

  const handleExecuteQuery = async (question: string, clarifiedIntent?: string) => {
    if (!question.trim() || isLoading) return;
    setIsLoading(true);
    setActiveTab('ask');
    setInputQuestion(question);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question, clarifiedIntent })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || errJson.message || 'Server error processing query');
      }

      const responseData: QueryPipelineResponse = await res.json();
      setCurrentResponse(responseData);
      setHistory((prev) => [responseData, ...prev]);
      setRelativeTime('Just now');
    } catch (err: any) {
      console.error('Query execution error:', err);
      const errorResponse: QueryPipelineResponse = {
        requestId: 'err-' + Date.now(),
        question,
        understanding: { intent: 'unknown', ambiguity: false },
        retrievedTables: [],
        generatedSql: '',
        formattedSql: '',
        validation: {
          isValid: false,
          isReadOnly: false,
          statementType: 'ERROR',
          tablesReferenced: [],
          errors: [err.message],
          warnings: []
        },
        execution: {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: err.message
        },
        explanation: `An error occurred while executing the query: ${err.message}`,
        selfCorrected: false,
        retryCount: 0,
        pipelineStages: [],
        totalLatencyMs: 0
      };
      setCurrentResponse(errorResponse);
      setHistory((prev) => [errorResponse, ...prev]);
      setRelativeTime('Just now');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteQuery(inputQuestion);
  };

  const handleSelectExample = (question: string) => {
    setInputQuestion(question);
    handleExecuteQuery(question);
  };

  const handleClarifyOption = (optionText: string) => {
    if (!currentResponse) return;
    handleExecuteQuery(currentResponse.question, optionText);
  };

  const handleConnectDb = async (params: string | { projectUrl?: string; password?: string; region?: string; databaseUrl?: string }) => {
    const payload = typeof params === 'string' ? { databaseUrl: params } : params;
    const res = await fetch('/api/database/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to connect to database');
    }
    // Remember that a DB has been connected in admin DB preferences (skip onboarding on future logins)
    await updatePreferences({
      hasConnectedDb: true,
      ...(typeof params !== 'string' && params.projectUrl ? { lastProjectUrl: params.projectUrl } : {})
    });
    await fetchDatabaseStatus();
    await fetchSchema(true);
  };

  const handleResetToDemo = async () => {
    const res = await fetch('/api/database/restore-default', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to disconnect database');
    }
    await updatePreferences({ hasConnectedDb: false, lastProjectUrl: null });
    await fetchDatabaseStatus();
    await fetchSchema(true);
  };

  const handleRunEvaluation = async (): Promise<EvaluationMetricReport> => {
    setIsRunningEvaluation(true);
    try {
      const res = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });
      if (!res.ok) {
        throw new Error('Benchmark execution failed');
      }
      const report: EvaluationMetricReport = await res.json();
      setEvaluationReport(report);
      return report;
    } finally {
      setIsRunningEvaluation(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#f8f9fc] flex text-slate-900 font-sans antialiased animate-fade-in">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          historyCount={history.length}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-white z-10 shadow-2xl flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <span className="font-bold text-slate-900">Menu</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                activeTab={activeTab}
                onSelectTab={(tab) => {
                  setActiveTab(tab);
                  setIsMobileMenuOpen(false);
                }}
                historyCount={history.length}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Row */}
        <header className="px-4 sm:px-8 py-3.5 flex items-center justify-between bg-transparent">
          {/* Mobile menu hamburger */}
          <div className="md:hidden flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Logo className="w-6 h-6 shrink-0" />
              <span className="font-bold text-slate-900 text-sm">QueryPilot</span>
            </div>
          </div>

          <div className="hidden md:block" />
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 px-4 sm:px-8 py-2 pb-12 max-w-6xl w-full mx-auto space-y-6" key={activeTab}>
          {activeTab === 'ask' && (
            <div className="space-y-6 animate-fade-slide-up">
              {/* Heading & View Schema link */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Ask your database anything
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Get instant insights from your data using natural language.
                  </p>
                </div>

                <button
                  id="view-schema-link-button"
                  type="button"
                  onClick={() => setIsSchemaModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition cursor-pointer self-start sm:self-auto"
                >
                  <Database className="w-4 h-4" />
                  <span>View Schema</span>
                </button>
              </div>

              {/* Natural Language Query Input Card */}
              <div>
                <form
                  onSubmit={handleFormSubmit}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-2 sm:p-2.5 flex items-center gap-3 transition-shadow focus-within:shadow-md focus-within:border-indigo-400"
                >
                  <Search className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
                  <input
                    id="nl-query-input"
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder="Type your question here..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 disabled:opacity-50"
                  />
                  <button
                    id="submit-query-button"
                    type="submit"
                    disabled={!inputQuestion.trim() || isLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Ask</span>
                      </>
                    )}
                  </button>
                </form>
                <p className="text-[11px] text-slate-400 text-right mt-1.5 pr-2 font-medium">
                  Press Enter to submit
                </p>
              </div>

              {/* Explore Your Data — dynamic live table cards from Supabase */}
              <ExploreYourData
                schema={schema}
                isRefreshing={isRefreshingSchema}
                onSelectQuestion={handleSelectExample}
                onRefreshSchema={() => fetchSchema(true)}
              />

              {/* Clarification Disambiguation Card */}
              {currentResponse && currentResponse.understanding.ambiguity && (
                <ClarificationCard
                  understanding={currentResponse.understanding}
                  onSelectOption={handleClarifyOption}
                  isLoading={isLoading}
                />
              )}

              {/* Results Section */}
              <ErrorBoundary inline>
                <ResultsSection
                  response={currentResponse}
                  isLoading={isLoading}
                  timestampText={relativeTime}
                />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-fade-slide-up">
            <HistoryTab
              history={history}
              onSelectQuery={(item) => {
                setCurrentResponse(item);
                setInputQuestion(item.question);
                setActiveTab('ask');
              }}
              onClearHistory={() => setHistory([])}
            />
          </div>
          )}

          {activeTab === 'database' && (
            <div className="animate-fade-slide-up">
            <DatabaseTab
              schema={schema}
              onRefresh={() => fetchSchema(true)}
              isRefreshing={isRefreshingSchema}
              onSelectQuestion={handleSelectExample}
            />
          </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-fade-slide-up">
            <SettingsTab
              dbStatus={dbStatus}
              onOpenConnectModal={() => setIsConnectModalOpen(true)}
              onRefreshSchema={() => fetchSchema(true)}
              isRefreshing={isRefreshingSchema}
            />
          </div>
          )}

          {activeTab === 'help' && (
            <div className="animate-fade-slide-up"><HelpTab /></div>
          )}
        </main>
      </div>

      {/* Modals */}
      <SchemaViewerModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        schema={schema}
        onRefresh={() => fetchSchema(true)}
        isRefreshing={isRefreshingSchema}
      />

      <ConnectDatabaseModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        currentConnection={dbStatus?.connectionString || ''}
        onConnect={handleConnectDb}
      />

      <EvaluationSuiteModal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
        onRunBenchmark={handleRunEvaluation}
        lastReport={evaluationReport}
        isRunning={isRunningEvaluation}
      />
    </div>
  );
}
