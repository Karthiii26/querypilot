import { authService } from './auth.js';
import { dbService } from './db.js';
import { ColumnInfo, DatabaseSchemaInfo, ForeignKeyInfo, TableSchema } from './types.js';

export class SchemaDiscoveryService {
  private userSchemas = new Map<number, DatabaseSchemaInfo>();
  private defaultSchema: DatabaseSchemaInfo | null = null;

  async discoverSchema(forceRefresh: boolean = false, userId?: number): Promise<DatabaseSchemaInfo> {
    // 1. If user pool is disconnected, attempt auto-reconnect using saved credentials before giving up
    if (userId !== undefined && !dbService.isConnected(userId)) {
      try {
        const prefs = await authService.getUserPreferences(userId);
        if (prefs.hasConnectedDb && prefs.lastProjectUrl && prefs.lastDbPassword) {
          console.log(`[SchemaDiscoveryService] Auto-reconnecting database for user ${userId}...`);
          await dbService.connectWithSupabaseCredentials(prefs.lastProjectUrl, prefs.lastDbPassword, userId);
        }
      } catch (connErr: any) {
        console.warn(`[SchemaDiscoveryService] Auto-reconnect failed for user ${userId}:`, connErr.message);
      }
    }

    // 2. If STILL disconnected, throw DB Connection Error (do NOT return fake 0 tables!)
    if (userId !== undefined && !dbService.isConnected(userId)) {
      throw new Error('Database is not connected. Re-authentication or database connection required.');
    }

    const cached = userId !== undefined ? this.userSchemas.get(userId) : this.defaultSchema;
    if (cached && !forceRefresh && cached.tables.length > 0) {
      return cached;
    }

    console.log(`[SchemaDiscoveryService] Inspecting dynamic database schema for user ${userId !== undefined ? userId : 'default'}...`);

    const EXCLUDED_SCHEMAS = [
      'pg_catalog',
      'information_schema',
      'pg_toast',
      'realtime',
      'auth',
      'storage',
      'supabase_migrations',
      'vault',
      'extensions',
      'graphql_public'
    ];

    const excludedListSql = EXCLUDED_SCHEMAS.map((s) => `'${s}'`).join(', ');

    // 3. Discover user tables via pg_catalog.pg_tables (most reliable across all Postgres instances)
    const tableEntriesMap = new Map<string, { table_name: string; table_schema: string }>();

    try {
      const pgTablesQuery = `
        SELECT 
          tablename::text AS table_name, 
          schemaname::text AS table_schema
        FROM pg_catalog.pg_tables
        WHERE schemaname NOT IN (${excludedListSql})
        ORDER BY schemaname, tablename;
      `;
      const tableRows = await dbService.queryRaw<{ table_name: string; table_schema: string }>(pgTablesQuery, userId);
      for (const r of tableRows) {
        if (r.table_name) {
          tableEntriesMap.set(r.table_name, { table_name: r.table_name, table_schema: r.table_schema || 'public' });
        }
      }
    } catch (err: any) {
      console.warn('[SchemaDiscoveryService] pg_tables query error:', err.message);
    }

    // Secondary discovery via information_schema.tables to include views or remaining tables
    try {
      const infoSchemaQuery = `
        SELECT 
          table_name::text AS table_name, 
          table_schema::text AS table_schema
        FROM information_schema.tables
        WHERE table_schema NOT IN (${excludedListSql})
        ORDER BY table_schema, table_name;
      `;
      const infoRows = await dbService.queryRaw<{ table_name: string; table_schema: string }>(infoSchemaQuery, userId);
      for (const r of infoRows) {
        if (r.table_name && !tableEntriesMap.has(r.table_name)) {
          tableEntriesMap.set(r.table_name, { table_name: r.table_name, table_schema: r.table_schema || 'public' });
        }
      }
    } catch (e: any) {
      console.warn('[SchemaDiscoveryService] information_schema fallback query error:', e.message);
    }

    const tableEntries = Array.from(tableEntriesMap.values());

    if (tableEntries.length === 0) {
      console.log(`[SchemaDiscoveryService] Verified DB query executed successfully: 0 tables found in database for user ${userId !== undefined ? userId : 'default'}.`);
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

    // 4. Discover column information from information_schema.columns
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
          table_name::text AS table_name,
          column_name::text AS column_name,
          data_type::text AS data_type,
          is_nullable::text AS is_nullable,
          column_default::text AS column_default
        FROM information_schema.columns
        WHERE table_schema NOT IN (${excludedListSql})
        ORDER BY table_schema, table_name, ordinal_position;
      `;
      columnRows = await dbService.queryRaw(columnsQuery, userId);
    } catch (e: any) {
      console.warn('[SchemaDiscoveryService] Error querying information_schema.columns:', e.message);
    }

    // 5. Discover primary keys
    const pkMap = new Map<string, Set<string>>();
    try {
      const pkQuery = `
        SELECT 
          tc.table_name::text AS table_name,
          kcu.column_name::text AS column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema NOT IN (${excludedListSql});
      `;
      const pkRows = await dbService.queryRaw<{ table_name: string; column_name: string }>(pkQuery, userId);
      for (const r of pkRows) {
        if (!pkMap.has(r.table_name)) pkMap.set(r.table_name, new Set());
        pkMap.get(r.table_name)!.add(r.column_name);
      }
    } catch {
      // Optional
    }

    // 6. Discover foreign keys
    const fkMap = new Map<string, ForeignKeyInfo[]>();
    try {
      const fkQuery = `
        SELECT
          tc.table_name::text AS table_name,
          kcu.column_name::text AS column_name,
          ccu.table_name::text AS foreign_table_name,
          ccu.column_name::text AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema NOT IN (${excludedListSql});
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

    // 7. Build TableSchema for each discovered table
    const tables: TableSchema[] = [];

    for (const entry of tableEntries) {
      const tableName = entry.table_name;
      const tableSchema = entry.table_schema;
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
        // Direct column fallback via SELECT * ... LIMIT 0
        try {
          const directRes = await dbService.executeReadOnlyQuery(`SELECT * FROM "${tableSchema}"."${tableName}" LIMIT 0`, 5000, 1000, userId);
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
          console.warn(`[SchemaDiscoveryService] Direct column inspection failed for ${tableSchema}.${tableName}:`, e.message);
        }
      }

      let rowCount = 0;
      try {
        const countRes = await dbService.queryRaw<{ count: string }>(`SELECT COUNT(*) as count FROM "${tableSchema}"."${tableName}"`, userId);
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

    console.log(`[SchemaDiscoveryService] Successfully discovered ${tables.length} tables for user ${userId !== undefined ? userId : 'default'}`);
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
