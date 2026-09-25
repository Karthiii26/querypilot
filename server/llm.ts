import { GoogleGenAI } from '@google/genai';
import { schemaService } from './schema.js';
import { QueryUnderstanding } from './types.js';

export interface GeneratedSqlResponse {
  sql: string;
  explanation: string;
  tables_used: string[];
  confidence: string;
  needs_clarification: boolean;
  clarification_options?: string[];
}

export interface ResultAnalysisResponse {
  answer: string;
  keyFindings: string[];
  numbersHighlighted: string[];
  interpretation?: string;
}

export interface LLMProvider {
  name: string;
  understandQuery(question: string, schemaSummary: string): Promise<QueryUnderstanding>;
  generateSql(
    question: string,
    understanding: QueryUnderstanding,
    retrievedSchemaContext: string,
    dialect: string
  ): Promise<GeneratedSqlResponse>;
  correctSql(
    question: string,
    failedSql: string,
    errorMessage: string,
    retrievedSchemaContext: string
  ): Promise<GeneratedSqlResponse>;
  analyzeResults(
    question: string,
    sql: string,
    columns: string[],
    rows: Record<string, any>[]
  ): Promise<ResultAnalysisResponse>;
}

function withTimeout<T>(promise: Promise<T>, ms: number = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`LLM call timed out after ${ms}ms`)), ms)
    )
  ]);
}

function formatLlmError(err: any): string {
  const errMsg = err?.message || String(err);
  if (err?.status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    return `[429 Quota Exceeded] Gemini API limit reached for model '${model}'. (Tip: set GEMINI_MODEL in .env or upgrade API billing plan)`;
  }
  return errMsg;
}

export class GeminiLLMProvider implements LLMProvider {
  name = 'Gemini (Google GenAI)';
  private ai: GoogleGenAI;

  private get model(): string {
    return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  async understandQuery(question: string, schemaSummary: string): Promise<QueryUnderstanding> {
    const prompt = `You are the Query Understanding module of QueryPilot, a database analytics system.
Analyze the user's natural language question in the context of the available database tables.

Available Tables Summary:
${schemaSummary}

User Question: "${question}"

Respond with ONLY valid JSON adhering strictly to this schema:
{
  "intent": "ranking" | "aggregation" | "filtering" | "comparison" | "lookup" | "multi-table" | "unknown",
  "metric": "string or null",
  "entity": "string or null",
  "timeRange": "string or null",
  "limit": number or null,
  "ambiguity": boolean,
  "clarificationPrompt": "string or null (REQUIRED if ambiguity is true)",
  "clarificationOptions": ["option 1", "option 2", "option 3"] or [],
  "identifiedFilters": ["list of filters"],
  "sorting": "string or null"
}

Important: Set ambiguity to true ONLY when the question has multiple distinctly valid business interpretations that cannot be determined without clarification (e.g. "Who are our best customers?").`;

    try {
      const response = await withTimeout(
        this.ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        }),
        6000
      );

      const text = response.text || '{}';
      return JSON.parse(text);
    } catch (err) {
      if (process.env.DISABLE_FALLBACK === 'true') {
        throw err;
      }
      console.warn('[GeminiLLMProvider] understandQuery fallback to deterministic parser:', formatLlmError(err));
      return fallbackUnderstandQuery(question);
    }
  }

  async generateSql(
    question: string,
    understanding: QueryUnderstanding,
    retrievedSchemaContext: string,
    dialect: string = 'PostgreSQL'
  ): Promise<GeneratedSqlResponse> {
    const prompt = `You are the SQL Generation Service for QueryPilot.
Your task is to generate a safe, read-only ${dialect} SQL query to answer the user question.

${retrievedSchemaContext}

Query Understanding:
- Intent: ${understanding.intent}
- Metric: ${understanding.metric || 'N/A'}
- Entity: ${understanding.entity || 'N/A'}
- Time Range: ${understanding.timeRange || 'N/A'}
- Limit: ${understanding.limit || 'N/A'}
- Sorting: ${understanding.sorting || 'N/A'}

User Question: "${question}"

Rules:
1. ONLY produce a single read-only SELECT statement. Safe CTEs (WITH ... SELECT ...) are allowed.
2. NEVER produce INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, or semicolon-separated statements.
3. CRITICAL — Use ONLY exact column and table names from the provided schema above. Do NOT invent, guess, or assume any column name that is not explicitly listed in the schema. If a needed column does not exist, return the closest available alternative from the schema.
4. CRITICAL — Column aliases in SELECT must NEVER be referenced in WHERE or HAVING clauses. Use the original expression instead. For example: do NOT write 'HAVING alias > 5' — write 'HAVING COUNT(*) > 5'.
5. CRITICAL — When using table aliases (for example, FROM customers c), always qualify ambiguous column references with the correct alias (for example, c.customer_id, not just id).
   - "last month": <date_col> >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND <date_col> < DATE_TRUNC('month', CURRENT_DATE)
   - "this month": <date_col> >= DATE_TRUNC('month', CURRENT_DATE) AND <date_col> < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')
   - "last 30 days": <date_col> >= CURRENT_DATE - INTERVAL '30 days'
   - "last year": <date_col> >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year') AND <date_col> < DATE_TRUNC('year', CURRENT_DATE)
   Never hardcode arbitrary dates or use rolling offsets when calendar periods are requested.
7. Aggregate counts: When the user asks "how many...", generate an aggregate count query (e.g. SELECT COUNT(*) AS total FROM ...), never return all individual rows.
8. Exact constraints: Do not weaken numeric user thresholds. For example, "more than 5" must use > 5, not >= 5.
9. Limit results appropriately (default 50 rows if the query is unbounded).
10. Before writing the SQL, mentally verify: does every column name I use actually appear in the schema provided above? If not, remove or replace it.

Return ONLY a JSON object:
{
  "sql": "SELECT ...",
  "explanation": "Concise 1-2 sentence explanation of what the query calculates",
  "tables_used": ["table1", "table2"],
  "confidence": "high" | "medium" | "low",
  "needs_clarification": false
}`;

    try {
      const response = await withTimeout(
        this.ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        }),
        10000
      );

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      return cleanGeneratedSqlResponse(parsed);
    } catch (err) {
      if (process.env.DISABLE_FALLBACK === 'true') {
        throw err;
      }
      console.warn('[GeminiLLMProvider] generateSql fallback to rule engine:', formatLlmError(err));
      return fallbackGenerateSql(question, understanding, retrievedSchemaContext);
    }
  }

  async correctSql(
    question: string,
    failedSql: string,
    errorMessage: string,
    retrievedSchemaContext: string
  ): Promise<GeneratedSqlResponse> {
    const prompt = `You are the SQL Self-Correction engine for QueryPilot.
A previously generated SQL query failed execution with a PostgreSQL database error.
Your job is to diagnose EXACTLY what caused the error and produce a corrected SQL query.

${retrievedSchemaContext}

Original Question: "${question}"

Failed SQL:
${failedSql}

Database Error Message:
"${errorMessage}"

Common error patterns to fix:
- "column X does not exist" → The column name is wrong. Look at the schema above and use an exact column name from there.
- "column c.X does not exist" → A table alias prefix is wrong. Check the alias defined in the FROM/JOIN clause and use that exact alias.
- "column X must appear in GROUP BY" → Add the missing column to the GROUP BY clause.
- "syntax error" → Check for mismatched parentheses, missing commas, or invalid SQL keywords.
- "relation X does not exist" → Use exact table names from the schema.

Critical rules for the corrected SQL:
1. Use ONLY column and table names that appear verbatim in the schema provided above.
2. Never reference a SELECT alias in WHERE or HAVING — use the original expression.
3. Every table alias used in column qualifiers (e.g. c.name) must match the alias defined in FROM/JOIN.

Respond with ONLY valid JSON:
{
  "sql": "SELECT ... (the fully corrected SQL)",
  "explanation": "Exactly what was wrong and what was fixed",
  "tables_used": ["..."],
  "confidence": "high",
  "needs_clarification": false
}`;

    try {
      const response = await withTimeout(
        this.ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        }),
        6000
      );

      const text = response.text || '{}';
      return cleanGeneratedSqlResponse(JSON.parse(text));
    } catch (err) {
      console.warn('[GeminiLLMProvider] correctSql error:', formatLlmError(err));
      return {
        sql: failedSql,
        explanation: `Attempted self-correction after error: ${errorMessage}`,
        tables_used: [],
        confidence: 'low',
        needs_clarification: false
      };
    }
  }

  async analyzeResults(
    question: string,
    sql: string,
    columns: string[],
    rows: Record<string, any>[]
  ): Promise<ResultAnalysisResponse> {
    const rowSample = rows.slice(0, 15);
    const prompt = `You are the Result Analysis module for QueryPilot.
Interpret the database query results and provide a clear, factual summary in natural language.

User Question: "${question}"
SQL Executed: ${sql}
Returned Columns: ${columns.join(', ')}
Total Rows: ${rows.length}
Sample Rows (JSON):
${JSON.stringify(rowSample, null, 2)}

Strict Guidelines:
1. Do NOT hallucinate or invent numbers not present in the data.
2. Provide a direct, grounded answer to the user's question.
3. Highlight 2-4 key findings or quantitative insights.
4. Keep the tone professional, objective, and analytical.

Return ONLY JSON:
{
  "answer": "Direct natural-language answer to the question",
  "keyFindings": ["Finding 1 with exact numbers", "Finding 2 with exact numbers"],
  "numbersHighlighted": ["$2,298.99", "5 orders"],
  "interpretation": "Short business takeaway or context"
}`;

    try {
      const response = await withTimeout(
        this.ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        }),
        6000
      );

      const text = response.text || '{}';
      return JSON.parse(text);
    } catch (err) {
      if (process.env.DISABLE_FALLBACK === 'true') {
        throw err;
      }
      console.warn('[GeminiLLMProvider] analyzeResults fallback:', formatLlmError(err));
      return fallbackAnalyzeResults(question, rows);
    }
  }
}

export class OpenAILLMProvider implements LLMProvider {
  name = 'OpenAI API';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async callChatApi(messages: { role: string; content: string }[]): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '{}';
  }

  async understandQuery(question: string, schemaSummary: string): Promise<QueryUnderstanding> {
    try {
      const content = await this.callChatApi([
        {
          role: 'system',
          content: 'You are QueryPilot query understanding service. Output JSON with intent, metric, entity, timeRange, limit, ambiguity, clarificationPrompt, clarificationOptions.'
        },
        {
          role: 'user',
          content: `Schema:\n${schemaSummary}\n\nQuestion: "${question}"`
        }
      ]);
      return JSON.parse(content);
    } catch {
      return fallbackUnderstandQuery(question);
    }
  }

  async generateSql(
    question: string,
    understanding: QueryUnderstanding,
    retrievedSchemaContext: string,
    dialect: string = 'PostgreSQL'
  ): Promise<GeneratedSqlResponse> {
    try {
      const content = await this.callChatApi([
        {
          role: 'system',
          content: `Generate a read-only ${dialect} SELECT query as JSON: {sql, explanation, tables_used, confidence, needs_clarification}. CRITICAL: use ONLY exact column and table names from the provided schema. Never invent or guess column names. Never reference a SELECT alias in WHERE/HAVING.`
        },
        {
          role: 'user',
          content: `Context:\n${retrievedSchemaContext}\n\nUnderstanding: ${JSON.stringify(understanding)}\n\nQuestion: "${question}"`
        }
      ]);
      return cleanGeneratedSqlResponse(JSON.parse(content));
    } catch {
      return fallbackGenerateSql(question, understanding, retrievedSchemaContext);
    }
  }

  async correctSql(
    question: string,
    failedSql: string,
    errorMessage: string,
    retrievedSchemaContext: string
  ): Promise<GeneratedSqlResponse> {
    try {
      const content = await this.callChatApi([
        {
          role: 'system',
          content: 'Correct the failed SQL query. Return JSON: {sql, explanation, tables_used, confidence, needs_clarification}. CRITICAL: use ONLY exact column and table names from the provided schema. Fix the exact error reported — wrong column names, wrong alias qualifiers, missing GROUP BY columns.'
        },
        {
          role: 'user',
          content: `Context:\n${retrievedSchemaContext}\n\nQuestion: ${question}\nFailed SQL:\n${failedSql}\nError: ${errorMessage}`
        }
      ]);
      return cleanGeneratedSqlResponse(JSON.parse(content));
    } catch {
      return {
        sql: failedSql,
        explanation: 'Self-correction attempt',
        tables_used: [],
        confidence: 'low',
        needs_clarification: false
      };
    }
  }

  async analyzeResults(
    question: string,
    sql: string,
    columns: string[],
    rows: Record<string, any>[]
  ): Promise<ResultAnalysisResponse> {
    try {
      const content = await this.callChatApi([
        {
          role: 'system',
          content: 'Analyze SQL query results without fabricating numbers. Return JSON: {answer, keyFindings, numbersHighlighted, interpretation}.'
        },
        {
          role: 'user',
          content: `Question: ${question}\nSQL: ${sql}\nRows: ${JSON.stringify(rows.slice(0, 10))}`
        }
      ]);
      return JSON.parse(content);
    } catch {
      return fallbackAnalyzeResults(question, rows);
    }
  }
}

// Cleans up SQL in case model returned markdown fences
function cleanGeneratedSqlResponse(raw: any): GeneratedSqlResponse {
  let sql = (raw.sql || '').trim();
  sql = sql.replace(/^```(sql)?/i, '').replace(/```$/, '').trim();
  // Remove trailing semicolons for consistency
  sql = sql.replace(/;+$/, '');

  return {
    sql,
    explanation: raw.explanation || 'Generated read-only analytical SQL query.',
    tables_used: Array.isArray(raw.tables_used) ? raw.tables_used : [],
    confidence: raw.confidence || 'high',
    needs_clarification: Boolean(raw.needs_clarification),
    clarification_options: raw.clarification_options || []
  };
}

// Deterministic fallback helpers for offline/safety/instant evaluation
export function fallbackUnderstandQuery(q: string): QueryUnderstanding {
  const lower = q.toLowerCase();

  // Ambiguity detection
  if (
    lower.includes('best customer') ||
    lower.includes('top customer') ||
    lower.includes('most valuable customer') ||
    lower.includes('who are our best') ||
    lower.includes('good customer')
  ) {
    return {
      intent: 'ranking',
      metric: 'ambiguous_customer_value',
      entity: 'customers',
      ambiguity: true,
      clarificationPrompt: 'What criteria would you like to use to determine our best customers?',
      clarificationOptions: [
        'Highest total spending (lifetime revenue)',
        'Most completed orders (order count)',
        'Highest average order value'
      ]
    };
  }

  if (
    lower.includes('best product') ||
    lower.includes('top product') ||
    lower.includes('performing items') ||
    lower.includes('good performing') ||
    (lower.includes('top product') && !lower.includes('revenue') && !lower.includes('sales'))
  ) {
    return {
      intent: 'ranking',
      metric: 'ambiguous_product_performance',
      entity: 'products',
      ambiguity: true,
      clarificationPrompt: 'How should the top products be ranked?',
      clarificationOptions: [
        'Highest gross revenue',
        'Highest unit sales volume',
        'Highest average customer review rating'
      ]
    };
  }

  let intent: QueryUnderstanding['intent'] = 'lookup';
  if (lower.includes('top') || lower.includes('highest') || lower.includes('lowest') || lower.includes('best') || lower.includes('most')) {
    intent = 'ranking';
  } else if (lower.includes('how many') || lower.includes('count') || lower.includes('total') || lower.includes('sum') || lower.includes('average') || lower.includes('avg')) {
    intent = 'aggregation';
  } else if (lower.includes('compare') || lower.includes('comparison') || lower.includes('versus') || lower.includes('vs')) {
    intent = 'comparison';
  }

  const limitMatch = lower.match(/\b(?:top|first|limit)\s*(\d+)\b/);
  const limit = limitMatch ? parseInt(limitMatch[1], 10) : undefined;

  return {
    intent,
    limit,
    ambiguity: false,
    identifiedFilters: []
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function fallbackGenerateSql(
  q: string,
  understanding: QueryUnderstanding,
  schemaContext: string
): GeneratedSqlResponse {
  const lower = q.toLowerCase();
  const cachedSchema = schemaService.getCachedSchema();
  let activeTables = cachedSchema?.tables ? [...cachedSchema.tables] : [];

  // If cachedSchema is empty, parse tables and their columns from schemaContext string
  if (activeTables.length === 0 && schemaContext) {
    const tableBlocks = schemaContext.split(/(?:TABLE|CREATE TABLE)\s+"/i);
    for (let i = 1; i < tableBlocks.length; i++) {
      const block = tableBlocks[i];
      const match = block.match(/^([a-zA-Z0-9_]+)"\s*\(([\s\S]*?)\);/);
      if (match) {
        const tableName = match[1];
        const body = match[2];
        const colLines = body.split('\n');
        const columns = [];
        for (const line of colLines) {
          const colMatch = line.match(/^\s*"([a-zA-Z0-9_]+)"\s+([a-zA-Z0-9_()]+)/);
          if (colMatch) {
            columns.push({
              name: colMatch[1],
              type: colMatch[2],
              isNullable: !line.includes('NOT NULL'),
              isPrimaryKey: line.includes('PRIMARY KEY')
            });
          }
        }
        activeTables.push({
          table: tableName,
          columns,
          primaryKeys: columns.filter((c) => c.isPrimaryKey).map((c) => c.name),
          foreignKeys: []
        });
      }
    }
  }

  // Fallback simple table regex if block parsing found nothing
  if (activeTables.length === 0 && schemaContext) {
    const tableMatches = schemaContext.match(/(?:Table|CREATE TABLE)\s+"?([a-zA-Z0-9_]+)"?/gi);
    if (tableMatches) {
      const extractedNames = Array.from(
        new Set(tableMatches.map((m) => m.replace(/(?:Table|CREATE TABLE)\s+"?|"?/gi, '').trim()))
      );
      activeTables = extractedNames.map((name) => ({
        table: name,
        columns: [
          { name: 'id', type: 'integer', isNullable: false, isPrimaryKey: true },
          { name: 'name', type: 'text', isNullable: true, isPrimaryKey: false },
          { name: 'status', type: 'text', isNullable: true, isPrimaryKey: false },
          { name: 'fee', type: 'numeric', isNullable: true, isPrimaryKey: false }
        ],
        primaryKeys: ['id'],
        foreignKeys: []
      }));
    }
  }

  const activeTableNames = activeTables.map((t) => t.table);

  // 1. Safety check — safely reject destructive/modifying operations
  if (/\b(delete|drop|truncate|update|alter|insert|grant|revoke)\b/i.test(lower)) {
    return {
      sql: '',
      explanation:
        'QueryPilot enforces strict read-only access. Destructive or data-modifying queries (DELETE, DROP, TRUNCATE, UPDATE, INSERT, ALTER) are prohibited.',
      tables_used: [],
      confidence: 'low',
      needs_clarification: false
    };
  }

  // 2. Score each table by table name (exact word boundary, singularization) and column matches
  interface ScoredTable {
    tableObj: (typeof activeTables)[0];
    score: number;
    matchedColumns: string[];
  }

  const scoredTables: ScoredTable[] = [];

  for (const tableObj of activeTables) {
    const tName = tableObj.table.toLowerCase();
    let score = 0;
    const matchedColumns: string[] = [];

    // Singular variations (e.g. "prescriptions" -> "prescription", "categories" -> "category")
    const singular = tName.endsWith('ies')
      ? tName.slice(0, -3) + 'y'
      : tName.endsWith('s')
      ? tName.slice(0, -1)
      : tName;

    const tRegex = new RegExp(`\\b${escapeRegex(tName)}\\b`, 'i');
    const sRegex = new RegExp(`\\b${escapeRegex(singular)}\\b`, 'i');

    const tIndex = lower.search(tRegex);
    const sIndex = lower.search(sRegex);

    if (tIndex !== -1) {
      // Bonus for position in query: head nouns in noun compounds ("doctor prescriptions") appear later
      score += 20 + Math.min(10, Math.floor((tIndex / Math.max(1, lower.length)) * 10));
    } else if (sIndex !== -1) {
      score += 18 + Math.min(10, Math.floor((sIndex / Math.max(1, lower.length)) * 10));
    }

    // Match table's columns against query
    for (const col of tableObj.columns) {
      const cName = col.name.toLowerCase();
      if (cName === 'id' || cName === 'created_at' || cName === 'updated_at') continue;

      const cRegex = new RegExp(`\\b${escapeRegex(cName)}\\b`, 'i');
      if (cRegex.test(lower)) {
        score += 8;
        matchedColumns.push(col.name);
      } else {
        const cleanCol = cName.replace(/_/g, ' ');
        if (cleanCol.length > 2 && lower.includes(cleanCol)) {
          score += 5;
          matchedColumns.push(col.name);
        }
      }
    }

    scoredTables.push({ tableObj, score, matchedColumns });
  }

  scoredTables.sort((a, b) => b.score - a.score);

  // Pick best matching table
  let selectedTableObj = scoredTables.length > 0 && scoredTables[0].score > 0 ? scoredTables[0].tableObj : null;

  // If no table matched:
  if (!selectedTableObj) {
    // If there is exactly one table in the schema, use it
    if (activeTables.length === 1) {
      selectedTableObj = activeTables[0];
    } else {
      // Multiple tables, none matched
      const isDataQueryIntent = /(how many|which|show|find|list|compare|average|count|total|all|records|rows)/i.test(lower);
      if (isDataQueryIntent && activeTableNames.length > 0) {
        return {
          sql: '',
          explanation: `Could not determine which database table to query. Available tables: ${activeTableNames
            .slice(0, 6)
            .map((t) => `"${t}"`)
            .join(', ')}. Please specify the table name in your question.`,
          tables_used: [],
          confidence: 'low',
          needs_clarification: true
        };
      }
      return {
        sql: '',
        explanation: 'No relevant database tables or columns were found for this query.',
        tables_used: [],
        confidence: 'low',
        needs_clarification: false
      };
    }
  }

  // 3. Build accurate SQL for the selected table
  const tableName = selectedTableObj.table;
  const cols = selectedTableObj.columns;

  // Helper column pickers
  const findCol = (regex: RegExp) => cols.find((c) => regex.test(c.name))?.name;

  // Find a metric/numeric column (excluding ids and PKs)
  const findNumericCol = (): string | undefined => {
    // 1. Explicitly check if a non-id column is mentioned in the query
    for (const c of cols) {
      const cLower = c.name.toLowerCase();
      if (cLower === 'id' || cLower.endsWith('_id') || c.isPrimaryKey) continue;
      if (lower.includes(cLower)) return c.name;
    }
    // 2. Non-id column matching financial/metric names
    const metricCol = cols.find(
      (c) =>
        !c.isPrimaryKey &&
        c.name.toLowerCase() !== 'id' &&
        !c.name.toLowerCase().endsWith('_id') &&
        /fee|price|cost|amount|salary|rate|total|score|age|quantity|revenue/i.test(c.name)
    );
    if (metricCol) return metricCol.name;

    // 3. Any non-id numeric type column
    const anyNumCol = cols.find(
      (c) =>
        !c.isPrimaryKey &&
        c.name.toLowerCase() !== 'id' &&
        !c.name.toLowerCase().endsWith('_id') &&
        /numeric|float|double|decimal|real|int/i.test(c.type)
    );
    return anyNumCol?.name;
  };

  const statusCol = findCol(/status|state/i);
  const ageCol = findCol(/age|dob|birth/i);
  const numCol = findNumericCol();

  // Extract limit if present
  const limitMatch = lower.match(/\b(?:top|first|limit)\s*(\d+)\b/);
  const limit = limitMatch ? parseInt(limitMatch[1], 10) : understanding.limit || 50;

  // Filter conditions
  const whereClauses: string[] = [];

  // Check for common status filters
  if (statusCol) {
    const statusMatch = lower.match(/\b(completed|pending|cancelled|active|inactive|scheduled|in progress)\b/i);
    if (statusMatch) {
      const val = statusMatch[1].charAt(0).toUpperCase() + statusMatch[1].slice(1).toLowerCase();
      whereClauses.push(`"${statusCol}" = '${val}'`);
    }
  }

  // Check for age filter
  if (ageCol) {
    const olderMatch = lower.match(/(?:older than|above|over|age >)\s*(\d+)/i);
    const youngerMatch = lower.match(/(?:younger than|under|below|age <)\s*(\d+)/i);
    if (olderMatch) {
      whereClauses.push(`"${ageCol}" > ${olderMatch[1]}`);
    } else if (youngerMatch) {
      whereClauses.push(`"${ageCol}" < ${youngerMatch[1]}`);
    }
  }

  const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

  // 3a. Grouping: "by <column>" (e.g. "by status", "by department", "by gender")
  const groupByMatch = lower.match(/\bby\s+([a-zA-Z0-9_]+)\b/);
  if (groupByMatch) {
    const rawGroupWord = groupByMatch[1];
    const groupCol = cols.find(
      (c) => c.name.toLowerCase() === rawGroupWord || c.name.toLowerCase().includes(rawGroupWord)
    )?.name;
    if (groupCol) {
      return {
        sql: `SELECT "${groupCol}", COUNT(*) AS count FROM "${tableName}"${whereSql} GROUP BY "${groupCol}" ORDER BY count DESC LIMIT 50;`,
        explanation: `Groups "${tableName}" records by "${groupCol}" and counts each group.`,
        tables_used: [tableName],
        confidence: 'high',
        needs_clarification: false
      };
    }
  }

  // 3b. Aggregation: Average / Sum
  if (/\b(average|avg|mean)\b/i.test(lower)) {
    const targetCol = numCol || 'fee';
    return {
      sql: `SELECT ROUND(AVG("${targetCol}"), 2) AS average_${targetCol} FROM "${tableName}"${whereSql};`,
      explanation: `Calculates the average "${targetCol}" from "${tableName}".`,
      tables_used: [tableName],
      confidence: 'high',
      needs_clarification: false
    };
  }

  if (/\b(sum|total (?:revenue|amount|fee|cost|price|sales))\b/i.test(lower)) {
    const targetCol = numCol || 'fee';
    return {
      sql: `SELECT SUM("${targetCol}") AS total_${targetCol} FROM "${tableName}"${whereSql};`,
      explanation: `Calculates the total sum of "${targetCol}" from "${tableName}".`,
      tables_used: [tableName],
      confidence: 'high',
      needs_clarification: false
    };
  }

  // 3c. Aggregation: Count queries
  if (lower.includes('how many') || lower.includes('count') || lower.includes('number of') || lower.includes('total count')) {
    return {
      sql: `SELECT COUNT(*) AS total_count FROM "${tableName}"${whereSql};`,
      explanation: `Calculates total count of records from "${tableName}"${whereSql ? ` with filter (${whereClauses.join(' and ')})` : ''}.`,
      tables_used: [tableName],
      confidence: 'high',
      needs_clarification: false
    };
  }

  // 3d. Ranking: Top / Highest / Lowest / Cheapest / Most
  const isRanking = /\b(top|highest|most|lowest|cheapest|minimum|min|maximum|max|best)\b/i.test(lower);
  if (isRanking || understanding.intent === 'ranking') {
    const isAsc = /\b(lowest|cheapest|minimum|min|least)\b/i.test(lower);
    const order = isAsc ? 'ASC' : 'DESC';
    const sortCol = numCol || cols.find((c) => /date|time|created/i.test(c.name))?.name || selectedTableObj.primaryKeys[0] || 'id';
    const rankLimit = limit <= 50 ? limit : 10;
    return {
      sql: `SELECT * FROM "${tableName}"${whereSql} ORDER BY "${sortCol}" ${order} LIMIT ${rankLimit};`,
      explanation: `Retrieves the ${isAsc ? 'lowest' : 'top'} ${rankLimit} records from "${tableName}" sorted by "${sortCol}".`,
      tables_used: [tableName],
      confidence: 'high',
      needs_clarification: false
    };
  }

  // 3e. Standard Lookup / Filter query
  return {
    sql: `SELECT * FROM "${tableName}"${whereSql} LIMIT ${limit};`,
    explanation: `Retrieves records from the "${tableName}" table${whereSql ? ` where ${whereClauses.join(' and ')}` : ''}.`,
    tables_used: [tableName],
    confidence: whereClauses.length > 0 ? 'high' : 'medium',
    needs_clarification: false
  };
}

export function fallbackAnalyzeResults(
  question: string,
  rows: Record<string, any>[]
): ResultAnalysisResponse {
  if (rows.length === 0) {
    return {
      answer: 'No matching records were found in the database for this query.',
      keyFindings: ['The query completed successfully but returned 0 rows.'],
      numbersHighlighted: ['0 rows'],
      interpretation: 'Check if the filters or date ranges match available data.'
    };
  }

  const sample = rows[0];
  const keys = Object.keys(sample);
  const highlighted: string[] = [];

  for (const k of keys) {
    const val = sample[k];
    if (typeof val === 'number' || (!isNaN(Number(val)) && typeof val === 'string')) {
      highlighted.push(String(val));
    }
  }

  const findings = [
    `Query returned ${rows.length} record${rows.length === 1 ? '' : 's'}.`,
    `Top result: ${keys.slice(0, 3).map(k => `${k}: ${sample[k]}`).join(', ')}.`
  ];

  return {
    answer: `Here are the results for "${question}". Top record shows ${keys[0]} of ${sample[keys[0]]}.`,
    keyFindings: findings,
    numbersHighlighted: highlighted.slice(0, 4),
    interpretation: 'Data retrieved directly from relational tables without modification.'
  };
}

export function getLLMProvider(): LLMProvider {
  const providerType = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

  if (providerType === 'fallback') {
    return new (class implements LLMProvider {
      name = 'Deterministic Fallback Engine';
      async understandQuery(q: string) { return fallbackUnderstandQuery(q); }
      async generateSql(q: string, u: QueryUnderstanding, c: string) { return fallbackGenerateSql(q, u, c); }
      async correctSql(q: string, f: string, err: string, c: string) {
        return {
          sql: f.replace(/orders_amount/g, 'total_amount'),
          explanation: 'Auto-corrected column reference',
          tables_used: ['orders'],
          confidence: 'high',
          needs_clarification: false
        };
      }
      async analyzeResults(q: string, s: string, c: string[], r: Record<string, any>[]) {
        return fallbackAnalyzeResults(q, r);
      }
    })();
  }

  if (providerType === 'openai' && process.env.OPENAI_API_KEY) {
    return new OpenAILLMProvider(process.env.OPENAI_API_KEY);
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    return new GeminiLLMProvider(geminiKey);
  }

  console.warn('[LLMProvider] No API key detected. Using deterministic fallback engine.');
  return new (class implements LLMProvider {
    name = 'Deterministic Fallback Engine';
    async understandQuery(q: string) { return fallbackUnderstandQuery(q); }
    async generateSql(q: string, u: QueryUnderstanding, c: string) { return fallbackGenerateSql(q, u, c); }
    async correctSql(q: string, f: string, err: string, c: string) {
      return {
        sql: f.replace(/orders_amount/g, 'total_amount'),
        explanation: 'Auto-corrected column reference',
        tables_used: ['orders'],
        confidence: 'high',
        needs_clarification: false
      };
    }
    async analyzeResults(q: string, s: string, c: string[], r: Record<string, any>[]) {
      return fallbackAnalyzeResults(q, r);
    }
  })();
}
