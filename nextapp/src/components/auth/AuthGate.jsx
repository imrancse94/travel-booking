'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { loginUrlFrom } from '../../lib/navState.js';

/**
 * Replaces the router-level <ProtectedRoute> element. The access token lives
 * in memory only, so the server cannot know who is signed in -- the gate has
 * to run on the client, after bootstrapSession() has settled.
 *
 * Renders nothing until the session is known, which avoids flashing a
 * protected page to a signed-out visitor before the redirect lands.
 */
export function AuthGate({ children }) {
  const { isAuthenticated, isLoading, isSigningOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading || isAuthenticated || isSigningOut()) return;
    const qs = searchParams.toString();
    router.replace(loginUrlFrom(qs ? `${pathname}?${qs}` : pathname));
  }, [isLoading, isAuthenticated, isSigningOut, pathname, searchParams, router]);

  if (isLoading || !isAuthenticated) return null;
  return children;
}

export default AuthGate;
