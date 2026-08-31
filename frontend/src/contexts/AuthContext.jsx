'use client';

import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapSession, loginThunk, logoutThunk } from '../store/authSlice.js';

// Session state lives in Redux (store/authSlice.js). This file only bootstraps
// the session once on mount and exposes the same `useAuth()` shape the rest
// of the app already depends on, so nothing consuming it needed to change.
export function AuthProvider({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);

  return children;
}

export function useAuth() {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);

  const login = useCallback(
    async (email, password) => {
      const action = await dispatch(loginThunk({ email, password }));
      if (loginThunk.rejected.match(action)) {
        throw action.error;
      }
      return action.payload;
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await dispatch(logoutThunk());
  }, [dispatch]);

  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      if (user.roles?.includes('Super Admin')) return true;
      return user.permissions?.includes(permission);
    },
    [user]
  );

  const hasRole = useCallback((role) => Boolean(user?.roles?.includes(role)), [user]);

  return { user, isLoading, isAuthenticated: Boolean(user), login, logout, hasPermission, hasRole };
}
