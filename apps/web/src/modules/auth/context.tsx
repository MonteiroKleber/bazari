// Auth Context - Provides useAuth hook for components
// path: apps/web/src/modules/auth/context.tsx

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  getAccessToken,
  getSessionUser,
  isSessionActive,
  setSession,
  clearSession,
  subscribeSession,
  type SessionPayload,
  type SessionEvent,
} from './session';

interface AuthUser {
  id: string;
  address: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: SessionPayload) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(getSessionUser);
  const [token, setToken] = useState<string | null>(getAccessToken);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state with session changes
  useEffect(() => {
    const updateState = () => {
      setUser(getSessionUser());
      setToken(getAccessToken());
    };

    // Subscribe to session events
    const unsubscribe = subscribeSession((event: SessionEvent) => {
      if (event === 'expired' || event === 'cleared') {
        setUser(null);
        setToken(null);
      }
    });

    // Also listen for storage events (cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bazari_session') {
        updateState();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const login = useCallback((payload: SessionPayload) => {
    setSession(payload);
    setUser(payload.user);
    setToken(payload.accessToken);
  }, []);

  const logout = useCallback(() => {
    clearSession('cleared');
    setUser(null);
    setToken(null);
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: isSessionActive(),
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback for components not wrapped in AuthProvider
    // This allows gradual migration
    return {
      user: getSessionUser(),
      token: getAccessToken(),
      isAuthenticated: isSessionActive(),
      isLoading: false,
      login: setSession,
      logout: () => clearSession('cleared'),
    };
  }
  return context;
}
