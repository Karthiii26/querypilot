import React, { createContext, useContext, useState, useEffect } from 'react';

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
        const res = await fetch('/api/auth/me', {
          credentials: 'include'
        });

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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
    setIsNewLogin(true);
  };

  const register = async (email: string, password: string, fullName: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
    setIsNewLogin(true);
  };

  const demoLogin = async () => {
    return login('karthikesh@querypilot.io', 'QueryPilot2026!');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPreferences(defaultPreferences);
    try {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    } catch {
      // ignore
    }
  };

  const resetNewLogin = () => setIsNewLogin(false);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>): Promise<UserPreferences> => {
    try {
      const res = await fetch('/api/auth/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(newPrefs)
      });

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
