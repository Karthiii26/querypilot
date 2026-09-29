import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserPreferences {
  hasConnectedDb: boolean;
  lastProjectUrl: string | null;
  lastEmail: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  preferences: UserPreferences;
  isLoading: boolean;
  isNewLogin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  resetNewLogin: () => void;
  updatePreferences: (newPrefs: Partial<UserPreferences>) => Promise<UserPreferences>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultPreferences: UserPreferences = {
  hasConnectedDb: false,
  lastProjectUrl: null,
  lastEmail: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNewLogin, setIsNewLogin] = useState(false);

  // Restore session on mount from cookie/session
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await apiFetch('/api/auth/me');

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(data.token);
          if (data.preferences) {
            setPreferences(data.preferences);
          }
        } else {
          setUser(null);
          setToken(null);
          setPreferences(defaultPreferences);
        }
      } catch (err) {
        console.warn('[AuthContext] Session restore network error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in. Please verify your credentials.');
    }

    setToken(data.token);
    setUser(data.user);
    if (data.preferences) {
      setPreferences(data.preferences);
    }
    // Remember email on this device only (localStorage is browser/device-local)
    try { localStorage.setItem('querypilot_last_email', email); } catch {}
    setIsNewLogin(true);
  };

  const register = async (email: string, password: string, fullName: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account.');
    }

    setToken(data.token);
    setUser(data.user);
    if (data.preferences) {
      setPreferences(data.preferences);
    }
    // Remember email on this device only
    try { localStorage.setItem('querypilot_last_email', email); } catch {}
    setIsNewLogin(true);
  };

  const demoLogin = async () => {
    return login('karthikesh@querypilot.io', 'QueryPilot2026!');
  };

  const logout = async () => {
    const currentToken = token;
    setToken(null);
    setUser(null);
    setPreferences(defaultPreferences);
    // Clear the locally remembered email on explicit logout
    try { localStorage.removeItem('querypilot_last_email'); } catch {}
    // Expire auth cookies directly in browser context
    try {
      document.cookie = 'querypilot_auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=Lax';
      document.cookie = 'querypilot_auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; SameSite=None; Secure';
    } catch {}

    try {
      await apiFetch('/api/auth/logout', { method: 'POST' }, currentToken);
    } catch (err) {
      console.warn('[AuthContext] Logout API call failed:', err);
    }
  };

  const resetNewLogin = () => setIsNewLogin(false);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>): Promise<UserPreferences> => {
    try {
      const res = await apiFetch('/api/auth/preferences', {
        method: 'PUT',
        body: JSON.stringify(newPrefs)
      }, token);

      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          setPreferences(data.preferences);
          return data.preferences;
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to update preferences in admin DB:', err);
    }

    // Local fallback in state if network issue
    const merged = { ...preferences, ...newPrefs };
    setPreferences(merged);
    return merged;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        preferences,
        isLoading,
        isNewLogin,
        login,
        register,
        demoLogin,
        logout,
        resetNewLogin,
        updatePreferences
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
