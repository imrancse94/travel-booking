'use client';

import { useAuth } from '../contexts/AuthContext.jsx';

/** Thin wrapper over useAuth().hasPermission for readability in JSX conditionals, e.g. `{usePermission('bookings.create') && <Button>Create</Button>}`. */
export function usePermission(permission) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

export default usePermission;
