import { format } from 'sql-formatter';
import { dbService } from './db.js';
import { intentRouter } from './intentRouter.js';
import { getLLMProvider } from './llm.js';
import { retrievalService } from './retrieval.js';
import { schemaService } from './schema.js';
import {
  DatabaseSchemaInfo,
  PipelineStageLog,
  QueryExecutionResult,
  QueryPipelineResponse,
  SqlValidationResult
} from './types.js';
import { sqlValidationService } from './validation.js';

export class QueryPilotPipeline {
  /**
   * Executes the full QueryPilot architecture with Intent Routing Gate, dynamic schema discovery, and AST validation.
   */
  async processQuery(question: string, clarifiedIntent?: string, userId?: number): Promise<QueryPipelineResponse> {
    const requestId = `qp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const pipelineStartTime = Date.now();
    const stages: PipelineStageLog[] = [];
    const correctionLog: string[] = [];

    const effectiveQuestion = clarifiedIntent
      ? `${question} (Disambiguation chosen: ${clarifiedIntent})`
      : question;

    // 1. Discover or get cached dynamic schema safely
    let schema: DatabaseSchemaInfo = { databaseName: 'postgres', dialect: 'postgresql', tables: [], discoveredAt: new Date().toISOString() };
    let schemaSummary = '';
    try {
      schema = await schemaService.discoverSchema(false, userId);
      schemaSummary = schema.tables
        .map((t) => `${t.table} (cols: ${t.columns.map((c) => c.name).join(', ')})`)
        .join('\n');
    } catch {
      // Schema summary defaults to empty if DB is offline or initializing
    }

    // STAGE 0: Intent Routing Gate
    const intentStart = Date.now();
    const intentResult = await intentRouter.classifyIntent(effectiveQuestion, schemaSummary);

    if (intentResult.intent === 'CONVERSATIONAL') {
      stages.push({
        stage: 'understanding',
        durationMs: Date.now() - intentStart,
        status: 'success',
        details: {
          intent: 'CONVERSATIONAL',
          confidence: intentResult.confidence,
          reasoning: intentResult.reasoning
        }
      });

      return {
        requestId,
        question,
        queryIntent: 'CONVERSATIONAL',
        understanding: {
          intent: 'unknown',
          ambiguity: false
        },
        retrievedTables: [],
        generatedSql: '',
        formattedSql: '',
        validation: {
          isValid: true,
          isReadOnly: true,
          statementType: 'CONVERSATIONAL',
          tablesReferenced: [],
          errors: [],
          warnings: []
        },
        execution: {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0
        },
        explanation: intentResult.conversationalResponse || 'Hello! I am QueryPilot, your AI database assistant. Ask me questions about your connected database!',
        selfCorrected: false,
        retryCount: 0,
        pipelineStages: stages,
        totalLatencyMs: Date.now() - pipelineStartTime
      };
    }

    if (intentResult.intent === 'CLARIFICATION' && !clarifiedIntent) {
      stages.push({
        stage: 'understanding',
        durationMs: Date.now() - intentStart,
        status: 'success',
        details: {
          intent: 'CLARIFICATION',
          confidence: intentResult.confidence,
          reasoning: intentResult.reasoning
        }
      });

      const clarificationPrompt = intentResult.clarificationPrompt || 'Your query is broad or ambiguous. Please select a clarification option below:';
      const clarificationOptions = intentResult.clarificationOptions || (
        schema.tables.length > 0
          ? schema.tables.slice(0, 3).map((t) => `How many ${t.table} are there?`)
          : ['Please specify which table you want to query.']
      );

      return {
        requestId,
        question,
        queryIntent: 'CLARIFICATION',
        understanding: {
          intent: 'unknown',
          ambiguity: true,
          clarificationPrompt,
          clarificationOptions
        },
        retrievedTables: [],
        generatedSql: '',
        formattedSql: '',
        validation: {
          isValid: false,
          isReadOnly: true,
          statementType: 'AMBIGUOUS',
          tablesReferenced: [],
          errors: ['Query requires clarification.'],
          warnings: []
        },
        execution: {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: 'Query requires clarification'
        },
        explanation: clarificationPrompt,
        selfCorrected: false,
        retryCount: 0,
        pipelineStages: stages,
        totalLatencyMs: Date.now() - pipelineStartTime
      };
    }

    const llm = getLLMProvider();
    console.log(`[Pipeline] Active LLM Provider: ${llm.name}`);

    // STAGE 1: Query Understanding
    const stage1Start = Date.now();
    const understanding = await llm.understandQuery(effectiveQuestion, schemaSummary);
    stages.push({
      stage: 'understanding',
      durationMs: Date.now() - stage1Start,
      status: 'success',
      details: {
        intent: understanding.intent,
        ambiguity: understanding.ambiguity,
        metric: understanding.metric,
        limit: understanding.limit
      }
    });

    // If query is ambiguous and user hasn't clarified yet, stop early and return clarification options
    if (understanding.ambiguity && !clarifiedIntent) {
      return {
        requestId,
        question,
        queryIntent: 'CLARIFICATION',
        understanding,
        retrievedTables: [],
        generatedSql: '',
        formattedSql: '',
        validation: {
          isValid: false,
          isReadOnly: true,
          statementType: 'AMBIGUOUS',
          tablesReferenced: [],
          errors: ['Query is ambiguous. Clarification required before SQL generation.'],
          warnings: []
        },
        execution: {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: 'Query requires clarification'
        },
        explanation: understanding.clarificationPrompt || 'This query has multiple possible interpretations. Please select one of the clarification options below.',
        selfCorrected: false,
        retryCount: 0,
        pipelineStages: stages,
        totalLatencyMs: Date.now() - pipelineStartTime
      };
    }

    // STAGE 2: Schema Retrieval / RAG
    const stage2Start = Date.now();
    const { relevantTables, retrievedTableNames, promptContext } =
      await retrievalService.retrieveRelevantSchema(effectiveQuestion, schema);
    stages.push({
      stage: 'retrieval',
      durationMs: Date.now() - stage2Start,
      status: 'success',
      details: {
        retrievedTables: retrievedTableNames,
        totalTablesAvailable: schema.tables.length
      }
    });

    // STAGE 3: SQL Generation
    const stage3Start = Date.now();
    let generatedSqlObj = await llm.generateSql(
      effectiveQuestion,
      understanding,
      promptContext,
      'PostgreSQL'
    );
    stages.push({
      stage: 'generation',
      durationMs: Date.now() - stage3Start,
      status: 'success',
      details: {
        sqlPreview: (generatedSqlObj.sql || '').slice(0, 100),
        confidence: generatedSqlObj.confidence
      }
    });

    // If no SQL query could be generated for the question, return a conversational response without executing database queries
    if (!generatedSqlObj.sql || !generatedSqlObj.sql.trim()) {
      return {
        requestId,
        question,
        queryIntent: 'CONVERSATIONAL',
        understanding,
        retrievedTables: retrievedTableNames,
        generatedSql: '',
        formattedSql: '',
        validation: {
          isValid: true,
          isReadOnly: true,
          statementType: 'CONVERSATIONAL',
          tablesReferenced: [],
          errors: [],
          warnings: []
        },
        execution: {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0
        },
        explanation: generatedSqlObj.explanation || 'Hello! I am QueryPilot, your AI database assistant. Ask me questions about your connected database tables!',
        selfCorrected: false,
        retryCount: 0,
        pipelineStages: stages,
        totalLatencyMs: Date.now() - pipelineStartTime
      };
    }

    // STAGE 4: SQL Validation
    const stage4Start = Date.now();
    let validation: SqlValidationResult = sqlValidationService.validateSql(generatedSqlObj.sql);
    stages.push({
      stage: 'validation',
      durationMs: Date.now() - stage4Start,
      status: validation.isValid ? 'success' : 'failed',
      details: {
        statementType: validation.statementType,
        isReadOnly: validation.isReadOnly,
        errors: validation.errors
      }
    });

    // If validation fails (e.g. non-SELECT or forbidden keywords), abort execution immediately!
    if (!validation.isValid) {
      return {
        requestId,
        question,
        queryIntent: 'DATABASE_QUERY',
        understanding,
        retrievedTables: retrievedTableNames,
        generatedSql: generatedSqlObj.sql,
        formattedSql: safeFormatSql(generatedSqlObj.sql),
        validation,
        execution: {
          success: false,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0,
          error: `Validation Security Rejection: ${validation.errors.join('; ')}`
        },
        explanation: `Query was blocked by the SQL validation and security layer: ${validation.errors[0]}`,
        selfCorrected: false,
        retryCount: 0,
        pipelineStages: stages,
        totalLatencyMs: Date.now() - pipelineStartTime
      };
    }

    // STAGE 5 & STAGE 6: Safe Database Execution with Self-Correction loop
    const maxRetries = 2;
    let retryCount = 0;
    let selfCorrected = false;
    let execution: QueryExecutionResult = {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0
    };

    while (retryCount <= maxRetries) {
      const execStart = Date.now();
      const maxQueryRows = parseInt(process.env.MAX_QUERY_ROWS || '1000', 10);
      const queryTimeout = parseInt(process.env.QUERY_TIMEOUT_MS || '10000', 10);
      execution = await dbService.executeReadOnlyQuery(generatedSqlObj.sql, queryTimeout, maxQueryRows, userId);

      if (execution.success) {
        stages.push({
          stage: 'execution',
          durationMs: Date.now() - execStart,
          status: 'success',
          details: {
            rowsReturned: execution.rowCount,
            columns: execution.columns
          }
        });
        break;
      }

      // If execution failed because of a SQL/schema error, invoke Self-Correction
      retryCount++;
      const errorMessage = execution.error || 'Unknown database execution error';
      correctionLog.push(`Attempt ${retryCount} failed: ${errorMessage}`);

      if (retryCount <= maxRetries) {
        console.log(`[Pipeline] Self-correction triggered (Attempt ${retryCount}/${maxRetries}) for error: ${errorMessage}`);
        const correctStart = Date.now();
        
        try {
          const corrected = await llm.correctSql(
            effectiveQuestion,
            generatedSqlObj.sql,
            errorMessage,
            promptContext
          );

          // If correction service returned the same SQL (e.g. rate-limited / timed out), bail out immediately
          if (corrected.sql.trim() === generatedSqlObj.sql.trim()) {
            correctionLog.push(`Correction service returned unchanged SQL (may be rate-limited). Stopping retries.`);
            console.warn('[Pipeline] Self-correction returned unchanged SQL — stopping retry loop.');
            break;
          }

          // Validate the corrected query before retrying
          const reValidation = sqlValidationService.validateSql(corrected.sql);
          if (reValidation.isValid) {
            generatedSqlObj = corrected;
            validation = reValidation;
            selfCorrected = true;
            stages.push({
              stage: 'correction',
              durationMs: Date.now() - correctStart,
              status: 'corrected',
              details: {
                attempt: retryCount,
                fixedSql: corrected.sql.slice(0, 100),
                explanation: corrected.explanation
              }
            });
            continue;
          } else {
            correctionLog.push(`Corrected SQL failed safety validation: ${reValidation.errors.join('; ')}`);
            break;
          }
        } catch (correctionErr: any) {
          correctionLog.push(`Correction service error: ${correctionErr.message}`);
          break;
        }
      }
    }

    // STAGE 7: Result Analysis
    const stage7Start = Date.now();
    let explanation = '';

    if (execution.success) {
      try {
        const analysis = await llm.analyzeResults(
          effectiveQuestion,
          generatedSqlObj.sql,
          execution.columns,
          execution.rows
        );
        explanation = analysis.answer;
        if (analysis.keyFindings && analysis.keyFindings.length > 0) {
          explanation += '\n\n' + analysis.keyFindings.map(f => `• ${f}`).join('\n');
        }
      } catch {
        explanation = generatedSqlObj.explanation;
      }

      stages.push({
        stage: 'analysis',
        durationMs: Date.now() - stage7Start,
        status: 'success',
        details: { rowCountAnalyzed: execution.rowCount }
      });
    } else {
      explanation = `The database query could not be executed after ${retryCount} attempts: ${execution.error}`;
      stages.push({
        stage: 'analysis',
        durationMs: Date.now() - stage7Start,
        status: 'failed',
        details: { error: execution.error }
      });
    }

    return {
      requestId,
      question,
      queryIntent: 'DATABASE_QUERY',
      understanding,
      retrievedTables: retrievedTableNames,
      generatedSql: generatedSqlObj.sql,
      formattedSql: safeFormatSql(generatedSqlObj.sql),
      validation,
      execution,
      explanation,
      selfCorrected,
      retryCount: selfCorrected ? retryCount : 0,
      correctionLog: correctionLog.length > 0 ? correctionLog : undefined,
      pipelineStages: stages,
      totalLatencyMs: Date.now() - pipelineStartTime
    };
  }
}

function safeFormatSql(sql: string): string {
  if (!sql) return '';
  try {
    return format(sql, { language: 'postgresql', tabWidth: 2, keywordCase: 'upper' });
  } catch {
    return sql;
  }
}

export const pipelineService = new QueryPilotPipeline();
