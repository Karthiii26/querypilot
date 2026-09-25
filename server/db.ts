import pg from 'pg';
import { QueryExecutionResult } from './types.js';

export type DatabaseConnectionType = 'supabase' | 'external';

export interface DatabaseConnectionInfo {
  connectionType: DatabaseConnectionType;
  connectionLabel: string;
  databaseName: string;
  isExternal: boolean;
  statusNotice?: string;
  connectionString: string;
}

export function extractProjectRef(input: string): string {
  const clean = input.trim();
  const match = clean.match(/([a-z0-9]{20})/i);
  if (match) return match[1];
  return clean.replace(/^https?:\/\//, '').replace(/\.supabase\.co.*$/, '').trim();
}

export interface UserConnectionState {
  pool: pg.Pool;
  connectedDbName: string;
  connectionType: DatabaseConnectionType;
}

/**
 * DatabaseService — Per-user Isolated Supabase and external PostgreSQL implementation.
 */
export class DatabaseService {
  private pgPool: pg.Pool | null = null;
  private connectionType: DatabaseConnectionType = 'supabase';
  private connectedDbName = '';
  private isExternal = true;

  // Isolated per-user connection pools & working candidate URL cache
  private userPools = new Map<number, UserConnectionState>();
  private userWorkingUrls = new Map<number, string>();

  // ---------------------------------------------------------------------------
  // connectWithSupabaseCredentials — connect using Project URL / Ref + Password
  // ---------------------------------------------------------------------------
  async connectWithSupabaseCredentials(
    projectUrlOrRef: string,
    password: string,
    userId?: number
  ): Promise<{ success: boolean; message: string }> {
    const projectRef = extractProjectRef(projectUrlOrRef);
    if (!projectRef) {
      throw new Error('Please provide a valid Supabase Project URL or Project ID.');
    }
    if (!password) {
      throw new Error('Please enter your Supabase database password.');
    }

    const candidateUrls: string[] = [];

    // If user has a previously cached working candidate URL, try it first!
    if (userId !== undefined && this.userWorkingUrls.has(userId)) {
      candidateUrls.push(this.userWorkingUrls.get(userId)!);
    }

    if (projectUrlOrRef.startsWith('postgres://') || projectUrlOrRef.startsWith('postgresql://')) {
      if (!candidateUrls.includes(projectUrlOrRef)) {
        candidateUrls.push(projectUrlOrRef);
      }
    } else {
      const encodedPassword = encodeURIComponent(password);

      // 1. Direct host candidates (Standard Supabase Dashboard connection formats)
      const directCandidates = [
        `postgresql://postgres.${projectRef}:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`,
        `postgresql://postgres.${projectRef}:${encodedPassword}@db.${projectRef}.supabase.co:6543/postgres`,
        `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`
      ];

      for (const cand of directCandidates) {
        if (!candidateUrls.includes(cand)) {
          candidateUrls.push(cand);
        }
      }

      // 2. AWS pooler candidates across standard regions
      const candidateRegions = [
        'ap-south-1',
        'ap-southeast-1',
        'us-east-1',
        'us-west-2',
        'eu-central-1',
        'eu-west-1',
        'us-east-2',
        'ap-northeast-1',
        'ap-southeast-2'
      ];

      for (const reg of candidateRegions) {
        const pooler6543 = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-${reg}.pooler.supabase.com:6543/postgres`;
        const pooler5432 = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-${reg}.pooler.supabase.com:5432/postgres`;
        if (!candidateUrls.includes(pooler6543)) candidateUrls.push(pooler6543);
        if (!candidateUrls.includes(pooler5432)) candidateUrls.push(pooler5432);
      }
    }

    let lastErr: any = null;
    for (const url of candidateUrls) {
      try {
        const res = await this._connectPool(userId, url, 'supabase', `Supabase Cloud PostgreSQL (${projectRef})`, 3000);
        if (userId !== undefined) {
          this.userWorkingUrls.set(userId, url);
        }
        return res;
      } catch (err: any) {
        lastErr = err;
      }
    }

    const sanitizedErr = lastErr?.message ? String(lastErr.message).replace(/:\/\/[^:]+:[^@]+@/, '://****:****@') : '';
    throw new Error(
      `Could not connect to Supabase project '${projectRef}'. Please verify your database password and ensure your Supabase project is active. (${sanitizedErr})`
    );
  }

  // ---------------------------------------------------------------------------
  // initialize / connectUserDatabase
  // ---------------------------------------------------------------------------
  async initialize(databaseUrl?: string, userId?: number): Promise<{ success: boolean; message: string }> {
    if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
      return this._connectPool(userId, databaseUrl, 'external', 'External PostgreSQL');
    }

    const supabaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (supabaseUrl && (supabaseUrl.startsWith('postgres://') || supabaseUrl.startsWith('postgresql://'))) {
      return this._connectPool(userId, supabaseUrl, 'supabase', 'Supabase Cloud PostgreSQL');
    }

    // No default URL configured — users connect their own Supabase DB via the UI.
    // This is expected on Render if SUPABASE_DB_URL is not set as an env var.
    console.warn('[DatabaseService] No SUPABASE_DB_URL or DATABASE_URL configured. Default server pool will remain uninitialized. Users must connect their own Supabase database via the UI.');
    return { success: false, message: 'No database connection URL configured. Connect via the UI.' };
  }

  private async _connectPool(
    userId: number | undefined,
    url: string,
    type: DatabaseConnectionType,
    label: string,
    timeoutMs: number = 5000
  ): Promise<{ success: boolean; message: string }> {
    const pool = new pg.Pool({
      connectionString: url,
      connectionTimeoutMillis: timeoutMs,
      ssl: { rejectUnauthorized: false }
    });

    await pool.query('SELECT 1');

    let dbName = 'postgres';
    try {
      const parsed = new URL(url);
      dbName = parsed.pathname.replace(/^\//, '') || 'postgres';
    } catch {
      dbName = 'postgres';
    }

    if (userId !== undefined) {
      const existing = this.userPools.get(userId);
      if (existing) {
        await existing.pool.end().catch(() => {});
      }
      this.userPools.set(userId, { pool, connectedDbName: dbName, connectionType: type });
    } else {
      if (this.pgPool) {
        await this.pgPool.end().catch(() => {});
      }
      this.pgPool = pool;
      this.connectedDbName = dbName;
      this.connectionType = type;
    }

    console.log(`[DatabaseService] User ${userId !== undefined ? userId : 'default'} connected to ${label} (db: ${dbName})`);
    return { success: true, message: `Connected to ${label} (${dbName})` };
  }

  async disconnectUser(userId: number): Promise<void> {
    const existing = this.userPools.get(userId);
    if (existing) {
      await existing.pool.end().catch(() => {});
      this.userPools.delete(userId);
      console.log(`[DatabaseService] Disconnected pool for user ${userId}`);
    }
  }

  async restoreDefault(): Promise<{ success: boolean; message: string }> {
    return this.initialize();
  }

  // ---------------------------------------------------------------------------
  // Getters & User Pool resolution
  // ---------------------------------------------------------------------------
  getUserPool(userId?: number): pg.Pool | null {
    if (userId !== undefined) {
      return this.userPools.get(userId)?.pool ?? null;
    }
    return this.pgPool;
  }

  /** Resolved pool for reads: authenticated users never inherit the server default pool. */
  private resolvePool(userId?: number): pg.Pool | null {
    if (userId !== undefined) {
      return this.userPools.get(userId)?.pool ?? null;
    }
    return this.pgPool;
  }

  getDatabaseName(userId?: number): string {
    if (userId !== undefined) {
      const state = this.userPools.get(userId);
      return state?.connectedDbName ?? '';
    }
    return this.connectedDbName;
  }

  getConnectionType(userId?: number): DatabaseConnectionType {
    if (userId !== undefined) {
      const state = this.userPools.get(userId);
      return state?.connectionType ?? 'supabase';
    }
    return this.connectionType;
  }

  getConnectionUrl(userId?: number): string {
    const type = this.getConnectionType(userId);
    if (type === 'supabase') return 'Supabase Cloud PostgreSQL';
    return 'External PostgreSQL';
  }

  getConnectionInfo(userId?: number): DatabaseConnectionInfo {
    const connected = userId !== undefined ? this.userPools.has(userId) : this.pgPool !== null;
    if (userId !== undefined && !connected) {
      return {
        connectionType: 'supabase',
        connectionLabel: 'Not connected',
        databaseName: '',
        isExternal: true,
        statusNotice: 'Connect your Supabase project to query your data.',
        connectionString: 'Not connected'
      };
    }
    const type = this.getConnectionType(userId);
    const label = type === 'supabase' ? 'Supabase Cloud PostgreSQL' : 'External PostgreSQL';
    return {
      connectionType: type,
      connectionLabel: label,
      databaseName: this.getDatabaseName(userId),
      isExternal: true,
      connectionString: this.getConnectionUrl(userId)
    };
  }

  isConnected(userId?: number): boolean {
    if (userId !== undefined) {
      return this.userPools.has(userId);
    }
    return this.pgPool !== null;
  }

  // ---------------------------------------------------------------------------
  // executeReadOnlyQuery for specific user pool
  // ---------------------------------------------------------------------------
  async executeReadOnlyQuery(
    sql: string,
    timeoutMs: number = 5000,
    maxRows: number = parseInt(process.env.MAX_QUERY_ROWS || '1000', 10),
    userId?: number
  ): Promise<QueryExecutionResult> {
    const startTime = Date.now();
    const pool = this.resolvePool(userId);

    if (!pool) {
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: 'No database connected for this user.'
      };
    }

    const client = await pool.connect();
    try {
      await client.query(`SET statement_timeout = ${Math.min(timeoutMs, 10_000)}`);
      await client.query('BEGIN READ ONLY');
      const result = await client.query(sql);
      await client.query('COMMIT');

      const rows = (result.rows || []).slice(0, maxRows);
      const columns = result.fields
        ? result.fields.map((f) => f.name)
        : rows[0]
        ? Object.keys(rows[0])
        : [];
      const executionTimeMs = Date.now() - startTime;

      return { success: true, columns, rows, rowCount: rows.length, executionTimeMs };
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs,
        error: err?.message || String(err)
      };
    } finally {
      client.release();
    }
  }

  async query<T = any>(sql: string, params?: any[], userId?: number): Promise<{ rows: T[] }> {
    const pool = this.resolvePool(userId);
    if (!pool) throw new Error('Database not connected');
    const res = await pool.query(sql, params);
    return { rows: res.rows as T[] };
  }

  async queryRaw<T = any>(sql: string, userId?: number): Promise<T[]> {
    const pool = this.resolvePool(userId);
    if (!pool) throw new Error('Database not connected');
    const res = await pool.query(sql);
    return res.rows as T[];
  }
}

export const dbService = new DatabaseService();
