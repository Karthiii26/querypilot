import pkg from 'node-sql-parser';
import { SqlValidationResult } from './types.js';

const ParserClass = (pkg as any).Parser || pkg;

export class SqlValidationService {
  private parser: any;

  constructor() {
    this.parser = new ParserClass();
  }

  /**
   * Performs deep AST and lexical safety validation on a generated SQL statement.
   */
  validateSql(sql: string): SqlValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const trimmed = sql.trim();

    if (!trimmed) {
      return {
        isValid: false,
        isReadOnly: false,
        statementType: 'EMPTY',
        tablesReferenced: [],
        errors: ['SQL query string cannot be empty.'],
        warnings: []
      };
    }

    // 1. Multiple statement detection: reject stacked queries (semicolon followed by another query)
    const statements = trimmed
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (statements.length > 1) {
      errors.push('Multiple statements (stacked queries with semicolon) are strictly prohibited for safety.');
    }

    const singleQuery = statements[0] || trimmed;

    // 2. Lexical keyword ban list (fast early guard against dangerous DDL/DML and procedural calls)
    const upperQuery = singleQuery.toUpperCase();
    const bannedKeywords = [
      'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
      'CREATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL',
      'COPY', 'RENAME', 'REPLACE', 'LOCK', 'VACUUM', 'REINDEX',
      'PG_SLEEP', 'PG_READ_FILE', 'PG_WRITE_FILE', 'SYSTEM', 'PG_SHADOW', 'PG_AUTHID'
    ];

    for (const kw of bannedKeywords) {
      // Check for standalone word boundary
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(upperQuery)) {
        errors.push(`Disallowed keyword or operational statement detected: '${kw}'. Only read-only SELECT queries are permitted.`);
      }
    }

    // 2b. Disallowed internal / Supabase-managed schema references
    const forbiddenSchemas = [
      'realtime', 'auth', 'storage', 'supabase_migrations', 'vault', 'extensions',
      'pg_catalog', 'information_schema', 'pg_toast', 'graphql_public'
    ];

    for (const schemaName of forbiddenSchemas) {
      const regex = new RegExp(`\\b${schemaName}\\.`, 'i');
      if (regex.test(upperQuery)) {
        errors.push(`Disallowed Supabase internal schema reference detected: '${schemaName}'. Only public application tables are accessible.`);
      }
    }

    // 3. AST Parsing using node-sql-parser
    let statementType = 'UNKNOWN';
    const tablesReferenced: string[] = [];
    let isReadOnly = false;
    let astSummary = '';

    try {
      // Parse with PostgreSQL dialect
      const ast = this.parser.astify(singleQuery, { database: 'postgresql' });

      const astArr = Array.isArray(ast) ? ast : [ast];
      if (astArr.length > 1) {
        errors.push('Multiple AST root nodes detected. Only a single read-only query is allowed.');
      }

      const rootNode = astArr[0];
      if (rootNode) {
        statementType = (rootNode.type || '').toUpperCase();

        if (statementType === 'SELECT') {
          isReadOnly = true;
        } else {
          isReadOnly = false;
          errors.push(`Disallowed statement type: '${statementType}'. Only 'SELECT' is permitted.`);
        }

        // Extract referenced tables via parser tableList
        try {
          const tableList = this.parser.tableList(singleQuery, { database: 'postgresql' });
          for (const item of tableList) {
            // item is format "select::null::table_name"
            const parts = item.split('::');
            const tableName = parts[parts.length - 1];
            if (tableName && !tablesReferenced.includes(tableName)) {
              tablesReferenced.push(tableName);
            }
          }
        } catch {
          // Table extraction fallback
        }

        astSummary = `Type: ${statementType}; Clauses: ${Object.keys(rootNode).filter(k => (rootNode as Record<string, any>)[k] !== null).join(', ')}`;
      }
    } catch (parseErr: any) {
      // If node-sql-parser fails (e.g. advanced CTE or Postgres-specific syntax), verify with strict lexical check
      const firstWord = upperQuery.replace(/^\s*--[^\n]*\n/g, '').trim().split(/\s+/)[0];
      if (firstWord === 'SELECT' || firstWord === 'WITH') {
        statementType = firstWord;
        isReadOnly = true;
        warnings.push(`AST parser note: advanced syntax parsed via lexical verifier: ${parseErr?.message?.slice(0, 80) || 'OK'}`);
      } else {
        errors.push(`SQL syntax error: ${parseErr?.message || 'Invalid SQL'}`);
      }
    }

    // Must start with SELECT or WITH
    const cleanPrefix = upperQuery.replace(/^(\s*--[^\n]*\n|\s*\/\*.*?\*\/)*/s, '').trim();
    if (!cleanPrefix.startsWith('SELECT') && !cleanPrefix.startsWith('WITH')) {
      errors.push("Query must begin with 'SELECT' or 'WITH' (read-only CTE).");
      isReadOnly = false;
    }

    return {
      isValid: errors.length === 0,
      isReadOnly,
      statementType,
      tablesReferenced,
      errors,
      warnings,
      astSummary
    };
  }
}

export const sqlValidationService = new SqlValidationService();
