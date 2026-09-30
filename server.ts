import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authService, toPublicUserPreferences } from './server/auth.js';
import { dbService } from './server/db.js';
import { EVALUATION_TEST_SUITE, evaluationService } from './server/evaluation.js';
import { pipelineService } from './server/pipeline.js';
import { schemaService } from './server/schema.js';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Configure CORS for cross-origin frontend support
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://localhost:4173',
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman, same-origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any onrender.com subdomains
      if (origin.endsWith('.onrender.com')) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  app.use(express.json());

  let isBackendReady = false;

  const initializeBackend = async () => {
    try {
      try {
        await dbService.initialize();
      } catch (dbErr) {
        console.warn('[Server] Default database pool not initialized:', dbErr instanceof Error ? dbErr.message : dbErr);
      }

      try {
        await authService.initialize();
      } catch (authErr) {
        console.error('[Server] Auth service initialization failed:', authErr instanceof Error ? authErr.message : authErr);
      }

      try {
        if (dbService.isConnected()) {
          await schemaService.discoverSchema(true);
        }
      } catch (schemaErr) {
        console.warn('[Server] Schema discovery skipped:', schemaErr instanceof Error ? schemaErr.message : schemaErr);
      }
    } finally {
      isBackendReady = true;
    }
  };

  initializeBackend();

  // ==========================================
  // API ROUTES
  // ==========================================

  const cookieSameSite = process.env.NODE_ENV === 'production' ? 'SameSite=None; Secure' : 'SameSite=Lax';

  function parseCookies(cookieHeader?: string): Record<string, string> {
    const list: Record<string, string> = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
      }
    });
    return list;
  }

  function getAuthToken(req: express.Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    const cookies = parseCookies(req.headers.cookie);
    return cookies.querypilot_auth_token || null;
  }

  function getAuthUserId(req: express.Request): number | undefined {
    const token = getAuthToken(req);
    if (!token) return undefined;
    const verified = authService.verifyToken(token);
    return verified?.userId;
  }

  async function syncUserDatabaseConnection(user: { id: number }) {
    try {
      const prefs = await authService.getUserPreferences(user.id);
      if (prefs.hasConnectedDb && prefs.lastProjectUrl && prefs.lastDbPassword) {
        if (!dbService.isConnected(user.id)) {
          await dbService.connectWithSupabaseCredentials(prefs.lastProjectUrl, prefs.lastDbPassword, user.id);
        }
        // Asynchronously discover schema without blocking auth responses
        schemaService.discoverSchema(false, user.id).catch((err) => {
          console.warn('[SyncUserDb] Background schema discovery error:', user.id, err.message);
        });
      } else {
        await dbService.disconnectUser(user.id);
      }
    } catch (e: any) {
      console.warn('[SyncUserDb] Failed to reconnect user database for user:', user.id, e.message);
      await authService.updateUserPreferences(user.id, { hasConnectedDb: false });
      await dbService.disconnectUser(user.id);
    }
  }

  // Authentication Routes (Supabase Cloud Database backed)
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, fullName } = req.body || {};
      const session = await authService.register(email, password, fullName);
      // Fire-and-forget: don't block the response on DB reconnect
      authService.updateUserPreferences(session.user.id, { lastEmail: email.trim().toLowerCase() }).catch(() => {});
      syncUserDatabaseConnection(session.user).catch(() => {});
      const preferences = await authService.getUserPreferences(session.user.id);

      res.setHeader('Set-Cookie', `querypilot_auth_token=${session.token}; Path=/; Max-Age=${72 * 3600}; ${cookieSameSite}`);
      res.status(201).json({ ...session, preferences: toPublicUserPreferences(preferences) });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const session = await authService.login(email, password);
      const preferences = await authService.getUserPreferences(session.user.id);

      // Respond to the user immediately — DB reconnect happens in the background
      res.setHeader('Set-Cookie', `querypilot_auth_token=${session.token}; Path=/; Max-Age=${72 * 3600}; ${cookieSameSite}`);
      res.json({ ...session, preferences: toPublicUserPreferences(preferences) });

      // After response sent: update prefs and reconnect user DB asynchronously
      authService.updateUserPreferences(session.user.id, { lastEmail: email.trim().toLowerCase() }).catch(() => {});
      syncUserDatabaseConnection(session.user).catch(() => {});
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Invalid credentials' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const token = getAuthToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }
      const verified = authService.verifyToken(token);
      if (!verified) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
      }
      const user = await authService.getUserById(verified.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const preferences = await authService.getUserPreferences(user.id);
      // Respond immediately — DB reconnect happens in background
      res.json({ user, token, preferences: toPublicUserPreferences(preferences) });
      syncUserDatabaseConnection(user).catch(() => {});
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  app.get('/api/auth/preferences', async (req, res) => {
    try {
      const token = getAuthToken(req);
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const verified = authService.verifyToken(token);
      if (!verified) return res.status(401).json({ error: 'Unauthorized' });
      const preferences = await authService.getUserPreferences(verified.userId);
      res.json({ preferences: toPublicUserPreferences(preferences) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/auth/preferences', async (req, res) => {
    try {
      const token = getAuthToken(req);
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const verified = authService.verifyToken(token);
      if (!verified) return res.status(401).json({ error: 'Unauthorized' });
      const { lastDbPassword: _ignored, ...safeBody } = req.body || {};
      const updated = await authService.updateUserPreferences(verified.userId, safeBody);
      res.json({ preferences: toPublicUserPreferences(updated) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    const userId = getAuthUserId(req);
    if (userId) {
      await dbService.disconnectUser(userId);
    }
    res.setHeader('Set-Cookie', [
      `querypilot_auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; ${cookieSameSite}`,
      'querypilot_auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax',
      'querypilot_auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Strict'
    ]);
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    const userId = getAuthUserId(req);
    const connInfo = dbService.getConnectionInfo(userId);
    res.json({
      status: isBackendReady ? 'ok' : 'initializing',
      ready: isBackendReady,
      service: 'QueryPilot',
      environment: process.env.NODE_ENV || 'development',
      adminDatabase: {
        type: 'supabase',
        label: 'Supabase Admin & Auth DB',
        name: authService.getDatabaseName() || 'postgres',
        status: authService.isConnected() ? 'healthy' : 'disconnected'
      },
      testingDatabase: {
        type: connInfo.connectionType,
        label: connInfo.connectionLabel,
        name: dbService.getDatabaseName(userId),
        status: dbService.isConnected(userId) ? 'healthy' : 'disconnected',
        notice: connInfo.statusNotice
      }
    });
  });

  // Database Connection Info
  app.get('/api/database/status', async (req, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Sign in required.' });
      }
      const schema = await schemaService.discoverSchema(false, userId);
      const connInfo = dbService.getConnectionInfo(userId);
      res.json({
        databaseName: dbService.getDatabaseName(userId),
        connectionString: dbService.getConnectionUrl(userId),
        connectionType: connInfo.connectionType,
        connectionLabel: connInfo.connectionLabel,
        isExternal: connInfo.isExternal,
        dialect: 'postgresql',
        tableCount: schema.tables.length,
        totalRows: schema.tables.reduce((acc, t) => acc + (t.rowCount || 0), 0),
        statusNotice: connInfo.statusNotice,
        adminDbName: authService.getDatabaseName(),
        adminDbConnected: authService.isConnected(),
        llmProvider: process.env.LLM_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'deterministic')
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Switch or connect to external database (by Project URL + password or fallback URL)
  app.post('/api/database/connect', async (req, res) => {
    try {
      const { databaseUrl, projectUrl, password } = req.body || {};
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Sign in to connect a database.' });
      }
      let initResult;

      if (projectUrl && password) {
        initResult = await dbService.connectWithSupabaseCredentials(projectUrl, password, userId);
      } else if (databaseUrl) {
        initResult = await dbService.initialize(databaseUrl, userId);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Please enter your Supabase Project URL or Project ID and Database Password.'
        });
      }

      await authService.updateUserPreferences(userId, {
        hasConnectedDb: true,
        lastProjectUrl: projectUrl || databaseUrl,
        lastDbPassword: password || null
      });

      const newSchema = await schemaService.discoverSchema(true, userId);
      const connInfo = dbService.getConnectionInfo(userId);
      res.json({
        success: true,
        databaseName: dbService.getDatabaseName(userId),
        connectionType: connInfo.connectionType,
        connectionLabel: connInfo.connectionLabel,
        tableCount: newSchema.tables.length,
        message: initResult.message
      });
    } catch (err: any) {
      const safeMsg = (err.message || String(err)).replace(/:\/\/[^:]+:[^@]+@/, '://****:****@');
      res.status(400).json({ success: false, error: safeMsg });
    }
  });

  // Reconnect to primary Supabase Cloud database
  app.post('/api/database/restore-default', async (req, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Sign in required.' });
      }
      await authService.updateUserPreferences(userId, {
        hasConnectedDb: false,
        lastProjectUrl: null,
        lastDbPassword: null
      });
      await dbService.disconnectUser(userId);
      schemaService.clearUserCache(userId);
      const newSchema = await schemaService.discoverSchema(true, userId);
      const connInfo = dbService.getConnectionInfo(userId);
      res.json({
        success: true,
        databaseName: dbService.getDatabaseName(userId),
        connectionType: connInfo.connectionType,
        connectionLabel: connInfo.connectionLabel,
        tableCount: newSchema.tables.length,
        message: 'Disconnected from your database. Connect a Supabase project to continue.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Schema Discovery & Refresh
  app.get('/api/schema', async (req, res) => {
    try {
      const force = req.query.refresh === 'true';
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Sign in required.' });
      }
      const schema = await schemaService.discoverSchema(force, userId);
      res.json(schema);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Query Execution Pipeline
  app.post('/api/query', async (req, res) => {
    try {
      const { question, clarifiedIntent } = req.body;
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Sign in to run database queries.' });
      }
      if (!dbService.isConnected(userId)) {
        return res.status(400).json({
          error: 'No database connected. Connect your Supabase project in Settings or onboarding.'
        });
      }
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'A question string is required.' });
      }

      console.log(`[API /api/query] Processing question for user ${userId}: "${question}"`);
      const response = await pipelineService.processQuery(question, clarifiedIntent, userId);
      res.json(response);
    } catch (err: any) {
      console.error('[API /api/query] Unhandled error:', err);
      res.status(500).json({
        error: 'Query processing failed',
        message: err.message
      });
    }
  });

  // ==========================================
  // QUERY HISTORY API
  // ==========================================

  // GET /api/history — fetch last 100 history items for user
  app.get('/api/history', async (req, res) => {
    try {
      const token = getAuthToken(req);
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const verified = authService.verifyToken(token);
      if (!verified) return res.status(401).json({ error: 'Unauthorized' });

      const result = await authService.query(
        `SELECT full_response, created_at FROM query_history
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [verified.userId]
      );

      const history = result.rows
        .map((r: any) => r.full_response)
        .filter(Boolean);

      res.json({ history });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/history — save a query result entry
  app.post('/api/history', async (req, res) => {
    try {
      const token = getAuthToken(req);
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const verified = authService.verifyToken(token);
      if (!verified) return res.status(401).json({ error: 'Unauthorized' });

      const entry = req.body;
      if (!entry || !entry.question) {
        return res.status(400).json({ error: 'Invalid history entry' });
      }

      await authService.query(
        `INSERT INTO query_history
           (user_id, request_id, question, generated_sql, query_intent,
            execution_success, row_count, execution_time_ms, error_message, full_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          verified.userId,
          entry.requestId || null,
          entry.question,
          entry.generatedSql || null,
          entry.queryIntent || null,
          entry.execution?.success ?? false,
          entry.execution?.rowCount ?? 0,
          entry.execution?.executionTimeMs ?? 0,
          entry.execution?.error || null,
          JSON.stringify(entry)
        ]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/history — clear all history for user
  app.delete('/api/history', async (req, res) => {
    try {
      const token = getAuthToken(req);
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const verified = authService.verifyToken(token);
      if (!verified) return res.status(401).json({ error: 'Unauthorized' });

      await authService.query(
        'DELETE FROM query_history WHERE user_id = $1',
        [verified.userId]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Evaluation Suite: Get test queries
  app.get('/api/evaluation/tests', (req, res) => {
    res.json({
      totalCount: EVALUATION_TEST_SUITE.length,
      tests: EVALUATION_TEST_SUITE
    });
  });

  // Evaluation Suite: Run benchmark
  app.post('/api/evaluation/run', async (req, res) => {
    try {
      const { testIds } = req.body || {};
      const report = await evaluationService.runEvaluation(testIds);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // VITE MIDDLEWARE / STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QueryPilot Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
