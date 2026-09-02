'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as authService from '../services/authService.js';

/**
 * Client-side view of the session that the SERVER resolved.
 *
 * This used to be a Redux store hydrated by a bootstrapSession() round trip on
 * mount, which meant every page began life not knowing who the user was. The
 * session now arrives as a prop from the root layout, so `user` is correct on
 * the very first render and `isLoading` only ever describes an in-flight
 * sign-in or sign-out.
 *
 * After either, router.refresh() re-runs the server components against the new
 * cookies -- that is what keeps the server's idea of the session and this one
 * from drifting apart.
 */
const SessionContext = createContext(null);

export function SessionProvider({ session = null, children }) {
  const [user, setUser] = useState(session);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const login = useCallback(
    async (email, password) => {
      setIsLoading(true);
      try {
        const nextUser = await authService.login(email, password);
        setUser(nextUser);
        router.refresh();
        return nextUser;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
      router.refresh();
    }
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      hasPermission: (permission) => {
        if (!user) return false;
        if (user.roles?.includes('Super Admin')) return true;
        return Boolean(user.permissions?.includes(permission));
      },
      hasRole: (role) => Boolean(user?.roles?.includes(role)),
    }),
    [user, isLoading, login, logout]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useAuth must be used within a SessionProvider');
  return ctx;
}

export default SessionProvider;
