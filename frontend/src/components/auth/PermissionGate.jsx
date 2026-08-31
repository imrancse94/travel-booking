'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext.jsx';

/**
 * Section-level authorisation, wrapping each admin page in the same permission
 * its ADMIN_NAV_ITEMS entry uses (constants/navigation.js). A section reachable
 * only by typing its URL is therefore denied exactly as it would be hidden from
 * the sidebar. Sits inside AuthGate, so by the time it runs there is a user.
 */
export function PermissionGate({ permission, role, children }) {
  const { isLoading, hasPermission, hasRole } = useAuth();
  const router = useRouter();

  const denied = (permission && !hasPermission(permission)) || (role && !hasRole(role));

  useEffect(() => {
    if (isLoading || !denied) return;
    router.replace('/');
  }, [isLoading, denied, router]);

  if (isLoading || denied) return null;
  return children;
}

export default PermissionGate;
