export interface ColumnInfo {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string | null;
}

export interface ForeignKeyInfo {
  column: string;
  referencesTable: string;
  referencesColumn: string;
}

export interface TableSchema {
  table: string;
  description?: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  rowCount?: number;
}

export interface DatabaseSchemaInfo {
  databaseName: string;
  dialect: 'postgresql';
  tables: TableSchema[];
  discoveredAt: string;
}

export interface QueryUnderstanding {
  intent: 'ranking' | 'aggregation' | 'filtering' | 'comparison' | 'lookup' | 'multi-table' | 'unknown';
  metric?: string;
  entity?: string;
  timeRange?: string;
  limit?: number;
  ambiguity: boolean;
  clarificationPrompt?: string;
  clarificationOptions?: string[];
  identifiedFilters?: string[];
  sorting?: string;
}

export interface SqlValidationResult {
  isValid: boolean;
  isReadOnly: boolean;
  statementType: string;
  tablesReferenced: string[];
  errors: string[];
  warnings: string[];
  astSummary?: string;
}

export interface QueryExecutionResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

export interface PipelineStageLog {
  stage: 'understanding' | 'retrieval' | 'generation' | 'validation' | 'execution' | 'correction' | 'analysis';
  durationMs: number;
  status: 'success' | 'skipped' | 'failed' | 'corrected';
  details?: Record<string, any>;
}

export type QueryIntentCategory = 'DATABASE_QUERY' | 'CONVERSATIONAL' | 'CLARIFICATION';

export interface QueryPipelineResponse {
  requestId: string;
  question: string;
  queryIntent?: QueryIntentCategory;
  understanding: QueryUnderstanding;
  retrievedTables: string[];
  generatedSql: string;
  formattedSql: string;
  validation: SqlValidationResult;
  execution: QueryExecutionResult;
  explanation: string;
  selfCorrected: boolean;
  retryCount: number;
  correctionLog?: string[];
  pipelineStages: PipelineStageLog[];
  totalLatencyMs: number;
}

export interface EvaluationTestCase {
  id: string;
  category: 'basic' | 'filtering' | 'aggregation' | 'ranking' | 'join' | 'multi-table' | 'date-analysis' | 'comparison' | 'ambiguity' | 'safety';
  question: string;
  expectedIntent: string;
  expectedTables: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  shouldPassSafety: boolean;
  isAmbiguous: boolean;
  groundTruthValidation?: string;
}

export interface EvaluationMetricReport {
  totalTests: number;
  completedTests: number;
  sqlSuccessRate: number; // percentage
  answerCorrectnessRate: number; // percentage
  schemaRetrievalRelevance: number; // percentage
  ambiguityAccuracy: number; // percentage
  safetyRejectionRate: number; // percentage
  averageLatencyMs: number;
  selfCorrectionSuccessRate: number; // percentage
  results: {
    testId: string;
    question: string;
    category: string;
    difficulty: string;
    passed: boolean;
    tablesMatched: boolean;
    retrievedTables: string[];
    expectedTables: string[];
    generatedSql?: string;
    error?: string;
    latencyMs: number;
    notes?: string;
  }[];
}
