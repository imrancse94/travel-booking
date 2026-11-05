'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction, logoutAction } from '../server/actions/auth.actions.js';
import { callAction } from '../lib/callAction.js';
import { setAccessToken, clearAccessToken } from '../services/tokenStore.js';

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
  // Set while a sign-out is navigating away, so AuthGate does not fire its own
  // competing redirect the moment `user` becomes null.
  const signingOutRef = useRef(false);

  const login = useCallback(
    async (email, password) => {
      setIsLoading(true);
      try {
        const { user: nextUser, accessToken } = await callAction(loginAction, email, password);
        setAccessToken(accessToken);
        signingOutRef.current = false;
        setUser(nextUser);
        router.refresh();
        return nextUser;
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  /**
   * Signs out and navigates to `redirectTo` as the ONE navigation. Previously
   * this also called router.refresh() while the caller pushed a route and
   * AuthGate replaced another; the refresh was cancelled mid-stream and React
   * threw "Cannot close a CLOSED writable stream". Navigating re-renders the
   * server components against the cleared cookies anyway.
   */
  const logout = useCallback(
    async (redirectTo = '/login') => {
      signingOutRef.current = true;
      setIsLoading(true);
      try {
        await callAction(logoutAction);
      } finally {
        clearAccessToken();
        setUser(null);
        setIsLoading(false);
        router.replace(redirectTo);
      }
    },
    [router]
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      isSigningOut: () => signingOutRef.current,
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
