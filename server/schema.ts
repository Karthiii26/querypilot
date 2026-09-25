import { dbService } from './db.js';
import { ColumnInfo, DatabaseSchemaInfo, ForeignKeyInfo, TableSchema } from './types.js';

export class SchemaDiscoveryService {
  private userSchemas = new Map<number, DatabaseSchemaInfo>();
  private defaultSchema: DatabaseSchemaInfo | null = null;

  async discoverSchema(forceRefresh: boolean = false, userId?: number): Promise<DatabaseSchemaInfo> {
    if (userId !== undefined && !dbService.isConnected(userId)) {
      const emptySchema: DatabaseSchemaInfo = {
        databaseName: '',
        dialect: 'postgresql',
        tables: [],
        discoveredAt: new Date().toISOString()
      };
      if (forceRefresh) {
        this.userSchemas.set(userId, emptySchema);
      }
      const cached = this.userSchemas.get(userId);
      if (cached && !forceRefresh) {
        return cached;
      }
      this.userSchemas.set(userId, emptySchema);
      return emptySchema;
    }

    const cached = userId !== undefined ? this.userSchemas.get(userId) : this.defaultSchema;
    if (cached && !forceRefresh) {
      return cached;
    }

    console.log(`[SchemaDiscoveryService] Inspecting dynamic database schema for user ${userId !== undefined ? userId : 'default'}...`);

    // 1. Discover all user tables strictly from the public schema.
    // Exclude all Supabase-managed schemas (realtime, auth, storage, supabase_migrations, vault, extensions, etc.)
    let tableNames: string[] = [];

    try {
      const publicTablesQuery = `
        SELECT tablename AS table_name
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND schemaname NOT IN ('realtime', 'auth', 'storage', 'supabase_migrations', 'vault', 'extensions', 'pg_catalog', 'information_schema', 'pg_toast', 'graphql_public')
        UNION
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type IN ('BASE TABLE', 'VIEW')
          AND table_schema NOT IN ('realtime', 'auth', 'storage', 'supabase_migrations', 'vault', 'extensions', 'pg_catalog', 'information_schema', 'pg_toast', 'graphql_public')
        ORDER BY table_name;
      `;
      const tableRows = await dbService.queryRaw<{ table_name: string }>(publicTablesQuery, userId);
      tableNames = tableRows.map((r) => r.table_name).filter(Boolean);
    } catch (err: any) {
      console.warn('[SchemaDiscoveryService] Primary public table discovery error:', err.message);
      try {
        const fallbackPublicQuery = `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type IN ('BASE TABLE', 'VIEW')
          ORDER BY table_name;
        `;
        const res = await dbService.queryRaw<{ table_name: string }>(fallbackPublicQuery, userId);
        tableNames = res.map((r) => r.table_name).filter(Boolean);
      } catch (e: any) {
        console.error('[SchemaDiscoveryService] Public table query fallback failed:', e.message);
      }
    }

    // Deduplicate table names
    tableNames = Array.from(new Set(tableNames));

    if (tableNames.length === 0) {
      console.log(`[SchemaDiscoveryService] No public tables found for user ${userId !== undefined ? userId : 'default'}.`);
      const emptySchema: DatabaseSchemaInfo = {
        databaseName: dbService.getDatabaseName(userId),
        dialect: 'postgresql',
        tables: [],
        discoveredAt: new Date().toISOString()
      };
      if (userId !== undefined) {
        this.userSchemas.set(userId, emptySchema);
      } else {
        this.defaultSchema = emptySchema;
      }
      return emptySchema;
    }

    // 2. Discover column information strictly from public schema
    let columnRows: Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }> = [];

    try {
      const columnsQuery = `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `;
      columnRows = await dbService.queryRaw(columnsQuery, userId);
    } catch (e: any) {
      console.warn('[SchemaDiscoveryService] Error querying information_schema.columns for public schema:', e.message);
    }

    // 3. Discover primary keys strictly from public schema
    const pkMap = new Map<string, Set<string>>();
    try {
      const pkQuery = `
        SELECT 
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public';
      `;
      const pkRows = await dbService.queryRaw<{ table_name: string; column_name: string }>(pkQuery, userId);
      for (const r of pkRows) {
        if (!pkMap.has(r.table_name)) pkMap.set(r.table_name, new Set());
        pkMap.get(r.table_name)!.add(r.column_name);
      }
    } catch {
      // Optional
    }

    // 4. Discover foreign keys strictly from public schema
    const fkMap = new Map<string, ForeignKeyInfo[]>();
    try {
      const fkQuery = `
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public';
      `;
      const fkRows = await dbService.queryRaw<{
        table_name: string;
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
      }>(fkQuery, userId);

      for (const r of fkRows) {
        if (!fkMap.has(r.table_name)) fkMap.set(r.table_name, []);
        fkMap.get(r.table_name)!.push({
          column: r.column_name,
          referencesTable: r.foreign_table_name,
          referencesColumn: r.foreign_column_name
        });
      }
    } catch {
      // Optional
    }

    // 5. Build TableSchema for each public table
    const tables: TableSchema[] = [];

    for (const tableName of tableNames) {
      const pks = Array.from(pkMap.get(tableName) || []);
      const fks = fkMap.get(tableName) || [];
      let colsForTable = columnRows.filter((c) => c.table_name === tableName);

      let columns: ColumnInfo[] = [];

      if (colsForTable.length > 0) {
        columns = colsForTable.map((c) => ({
          name: c.column_name,
          type: c.data_type,
          isNullable: c.is_nullable === 'YES',
          isPrimaryKey: pks.includes(c.column_name),
          defaultValue: c.column_default
        }));
      } else {
        try {
          const directRes = await dbService.executeReadOnlyQuery(`SELECT * FROM "public"."${tableName}" LIMIT 0`, 5000, 1000, userId);
          if (directRes.columns.length > 0) {
            columns = directRes.columns.map((colName) => ({
              name: colName,
              type: 'text',
              isNullable: true,
              isPrimaryKey: pks.includes(colName),
              defaultValue: null
            }));
          }
        } catch (e: any) {
          console.warn(`[SchemaDiscoveryService] Direct column inspection failed for public.${tableName}:`, e.message);
        }
      }

      let rowCount = 0;
      try {
        const countRes = await dbService.queryRaw<{ count: string }>(`SELECT COUNT(*) as count FROM "public"."${tableName}"`, userId);
        rowCount = parseInt(countRes[0]?.count || '0', 10);
      } catch {
        rowCount = 0;
      }

      tables.push({
        table: tableName,
        columns,
        primaryKeys: pks,
        foreignKeys: fks,
        rowCount
      });
    }

    const newSchema: DatabaseSchemaInfo = {
      databaseName: dbService.getDatabaseName(userId),
      dialect: 'postgresql',
      tables,
      discoveredAt: new Date().toISOString()
    };

    if (userId !== undefined) {
      this.userSchemas.set(userId, newSchema);
    } else {
      this.defaultSchema = newSchema;
    }

    console.log(`[SchemaDiscoveryService] Successfully discovered ${tables.length} public tables for user ${userId !== undefined ? userId : 'default'}`);
    return newSchema;
  }

  getCachedSchema(userId?: number): DatabaseSchemaInfo | null {
    if (userId !== undefined) {
      return this.userSchemas.get(userId) || null;
    }
    return this.defaultSchema;
  }

  clearUserCache(userId: number): void {
    this.userSchemas.delete(userId);
  }
}

export const schemaService = new SchemaDiscoveryService();

