'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from './api';
import type { BootstrapResponse, Organization, User } from './types';

const STORAGE_KEY = 'crm_session';

interface StoredSession {
  token: string;
  user: User;
  organization: Organization;
}

interface AuthContextValue {
  session: StoredSession | null;
  bootstrap: BootstrapResponse | null;
  api: ApiClient;
  isLoading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const api = useMemo(() => new ApiClient(session?.token ?? null), [session?.token]);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    if (!session?.token) return;
    const data = await new ApiClient(session.token).bootstrap();
    setBootstrap(data);
  }, [session?.token]);

  useEffect(() => {
    if (session?.token) {
      refreshBootstrap().catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setSession(null);
        setBootstrap(null);
      });
    } else {
      setBootstrap(null);
    }
  }, [session?.token, refreshBootstrap]);

  const signIn = useCallback(
    async (email: string) => {
      const result = await new ApiClient(null).login(email);
      const stored: StoredSession = { token: result.token, user: result.user, organization: result.organization };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setSession(stored);
      router.push('/dashboard');
    },
    [router]
  );

  const signOut = useCallback(async () => {
    if (session?.token) {
      try {
        await new ApiClient(session.token).logout();
      } catch {
        /* best-effort */
      }
    }
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setBootstrap(null);
    router.push('/login');
  }, [router, session?.token]);

  const value: AuthContextValue = {
    session,
    bootstrap,
    api,
    isLoading,
    signIn,
    signOut,
    refreshBootstrap
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
