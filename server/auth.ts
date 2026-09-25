import crypto from 'crypto';
import pg from 'pg';

export interface AppUser {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  token: string;
  user: AppUser;
  expiresAt: string;
}

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? ''
    : 'querypilot-dev-auth-secret-change-in-production');
const TOKEN_TTL_HOURS = 72; // 3 days

function getAuthSecretKey(): Buffer {
  if (!AUTH_SECRET) {
    throw new Error('AUTH_SECRET must be set in production.');
  }
  return crypto.scryptSync(AUTH_SECRET, 'querypilot-auth-salt', 32);
}

function encryptDbPassword(plain: string): string {
  if (!plain) return '';
  const key = getAuthSecretKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`;
}

function decryptDbPassword(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith('v1:')) {
    return stored;
  }
  try {
    const [, ivB64, tagB64, dataB64] = stored.split(':');
    const key = getAuthSecretKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}

export interface PublicUserPreferences {
  hasConnectedDb: boolean;
  lastProjectUrl: string | null;
  lastEmail: string | null;
}

export function toPublicUserPreferences(prefs: UserPreferences): PublicUserPreferences {
  return {
    hasConnectedDb: prefs.hasConnectedDb,
    lastProjectUrl: prefs.lastProjectUrl,
    lastEmail: prefs.lastEmail
  };
}

export class AuthService {
  private pgPool: pg.Pool | null = null;
  private isInitialized = false;
  private connectedDbName = '';

  async initialize(): Promise<void> {
    if (this.isInitialized && this.pgPool) return;

    const adminUrl =
      process.env.SUPABASE_ADMIN_DB_URL ||
      process.env.ADMIN_DB_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.DATABASE_URL;

    if (!adminUrl) {
      console.warn('[AuthService] No SUPABASE_ADMIN_DB_URL or SUPABASE_DB_URL found. Auth service will remain uninitialized.');
      return;
    }

    try {
      if (this.pgPool) {
        await this.pgPool.end().catch(() => {});
        this.pgPool = null;
      }

      const pool = new pg.Pool({
        connectionString: adminUrl,
        connectionTimeoutMillis: 10_000,
        ssl: { rejectUnauthorized: false }
      });

      await pool.query('SELECT 1');
      this.pgPool = pool;

      try {
        const parsed = new URL(adminUrl);
        this.connectedDbName = parsed.pathname.replace(/^\//, '') || 'postgres';
      } catch {
        this.connectedDbName = 'postgres';
      }

      // Ensure the app_users table exists in Supabase Admin DB
      await this.query(`
        CREATE TABLE IF NOT EXISTS app_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name VARCHAR(255),
          avatar_url TEXT,
          role VARCHAR(50) DEFAULT 'user',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_login_at TIMESTAMP WITH TIME ZONE
        );
      `);

      // Ensure user_preferences table exists in Supabase Admin DB
      await this.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id INT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
          has_connected_db BOOLEAN DEFAULT FALSE,
          last_project_url TEXT,
          last_db_password TEXT,
          last_email TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS last_db_password TEXT;
      `);

      // Seed default demo user if app_users is empty
      const countRes = await this.query('SELECT COUNT(*) AS count FROM app_users;');
      const count = parseInt(countRes.rows[0]?.count || '0', 10);
      if (count === 0) {
        await this.seedDemoUser();
      }

      this.isInitialized = true;
      console.log(`[AuthService] Supabase Admin & Auth DB connected (db: ${this.connectedDbName}) and user tables ready.`);
    } catch (err: any) {
      console.error('[AuthService] Failed to initialize auth table in Supabase Admin DB:', err.message);
    }
  }

  isConnected(): boolean {
    return this.pgPool !== null && this.isInitialized;
  }

  getDatabaseName(): string {
    return this.connectedDbName;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
    if (!this.pgPool) {
      throw new Error('Admin/Auth Database not connected. Please configure SUPABASE_ADMIN_DB_URL in .env');
    }
    const res = await this.pgPool.query(sql, params);
    return { rows: res.rows as T[] };
  }

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  private createToken(user: AppUser): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000).toISOString();
    const payload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        exp: Math.floor((Date.now() + TOKEN_TTL_HOURS * 3600 * 1000) / 1000)
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  verifyToken(token: string): { userId: number; email: string; role: string; fullName: string } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, payload, signature] = parts;

      const expectedSig = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }

      return {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        fullName: decoded.fullName
      };
    } catch {
      return null;
    }
  }

  async register(email: string, password: string, fullName?: string): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    // Check if user already exists
    const existing = await this.query('SELECT id FROM app_users WHERE LOWER(email) = $1 LIMIT 1;', [cleanEmail]);
    if (existing.rows.length > 0) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = this.hashPassword(password);
    const displayName = (fullName || cleanEmail.split('@')[0]).trim();

    const insertRes = await this.query(
      `INSERT INTO app_users (email, password_hash, full_name, role, created_at, last_login_at)
       VALUES ($1, $2, $3, 'user', NOW(), NOW())
       RETURNING id, email, full_name, avatar_url, role, created_at, last_login_at;`,
      [cleanEmail, passwordHash, displayName]
    );

    const row = insertRes.rows[0];
    const user: AppUser = {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      role: row.role,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at
    };

    const token = this.createToken(user);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000).toISOString();

    return { token, user, expiresAt };
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    const res = await this.query(
      'SELECT id, email, password_hash, full_name, avatar_url, role, created_at, last_login_at FROM app_users WHERE LOWER(email) = $1 LIMIT 1;',
      [cleanEmail]
    );

    if (res.rows.length === 0) {
      throw new Error('Invalid email or password.');
    }

    const row = res.rows[0];
    const isMatch = this.verifyPassword(password, row.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    // Update last login timestamp
    await this.query('UPDATE app_users SET last_login_at = NOW() WHERE id = $1;', [row.id]);

    const user: AppUser = {
      id: row.id,
      email: row.email,
      fullName: row.full_name || row.email.split('@')[0],
      avatarUrl: row.avatar_url,
      role: row.role,
      createdAt: row.created_at,
      lastLoginAt: new Date().toISOString()
    };

    const token = this.createToken(user);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000).toISOString();

    return { token, user, expiresAt };
  }

  async getUserById(id: number): Promise<AppUser | null> {
    const res = await this.query(
      'SELECT id, email, full_name, avatar_url, role, created_at, last_login_at FROM app_users WHERE id = $1 LIMIT 1;',
      [id]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name || row.email.split('@')[0],
      avatarUrl: row.avatar_url,
      role: row.role,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at
    };
  }

  async getUserPreferences(userId: number): Promise<UserPreferences> {
    try {
      const res = await this.query(
        'SELECT has_connected_db, last_project_url, last_db_password, last_email FROM user_preferences WHERE user_id = $1 LIMIT 1;',
        [userId]
      );
      if (res.rows.length === 0) {
        return { hasConnectedDb: false, lastProjectUrl: null, lastDbPassword: null, lastEmail: null };
      }
      const row = res.rows[0];
      return {
        hasConnectedDb: Boolean(row.has_connected_db),
        lastProjectUrl: row.last_project_url || null,
        lastDbPassword: decryptDbPassword(row.last_db_password),
        lastEmail: row.last_email || null,
      };
    } catch {
      return { hasConnectedDb: false, lastProjectUrl: null, lastDbPassword: null, lastEmail: null };
    }
  }

  async updateUserPreferences(userId: number, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);

    const passwordForDb =
      prefs.lastDbPassword !== undefined
        ? prefs.lastDbPassword
          ? encryptDbPassword(prefs.lastDbPassword)
          : null
        : current.lastDbPassword
          ? encryptDbPassword(current.lastDbPassword)
          : null;

    const updated = {
      hasConnectedDb: prefs.hasConnectedDb !== undefined ? prefs.hasConnectedDb : current.hasConnectedDb,
      lastProjectUrl: prefs.lastProjectUrl !== undefined ? prefs.lastProjectUrl : current.lastProjectUrl,
      lastEmail: prefs.lastEmail !== undefined ? prefs.lastEmail : current.lastEmail,
    };

    await this.query(
      `INSERT INTO user_preferences (user_id, has_connected_db, last_project_url, last_db_password, last_email, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         has_connected_db = EXCLUDED.has_connected_db,
         last_project_url = EXCLUDED.last_project_url,
         last_db_password = EXCLUDED.last_db_password,
         last_email = EXCLUDED.last_email,
         updated_at = NOW();`,
      [userId, updated.hasConnectedDb, updated.lastProjectUrl, passwordForDb, updated.lastEmail]
    );

    return {
      ...updated,
      lastDbPassword: decryptDbPassword(passwordForDb),
    };
  }


  private async seedDemoUser(): Promise<void> {
    try {
      const demoEmail = 'karthikesh@querypilot.io';
      const demoPasswordHash = this.hashPassword('QueryPilot2026!');
      await this.query(
        `INSERT INTO app_users (email, password_hash, full_name, role, created_at)
         VALUES ($1, $2, $3, 'admin', NOW())
         ON CONFLICT (email) DO NOTHING;`,
        [demoEmail, demoPasswordHash, 'Karthikesh Ram']
      );
      console.log('[AuthService] Default demo user seeded: karthikesh@querypilot.io');
    } catch (e: any) {
      console.warn('[AuthService] Could not seed demo user:', e.message);
    }
  }
}

export interface UserPreferences {
  hasConnectedDb: boolean;
  lastProjectUrl: string | null;
  lastDbPassword?: string | null;
  lastEmail: string | null;
}

export const authService = new AuthService();
