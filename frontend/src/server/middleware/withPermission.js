import { AuthenticationError, AuthorizationError } from '../utils/errors.js';

/**
 * Replaces Express's `requirePermission`/`requireRole` guards. Pure function
 * of the `user` object `withAuth` returns -- nothing here was ever
 * Express-specific, so this ports over unchanged in behavior, just called
 * directly instead of wired in as middleware.
 *
 * requirePermission(user, 'bookings.create') or
 * requirePermission(user, ['bookings.view', 'bookings.update']) for ANY match.
 */
export function requirePermission(user, permissionOrList) {
  if (!user) {
    throw new AuthenticationError();
  }
  if (user.roles.includes('Super Admin')) {
    return;
  }

  const required = Array.isArray(permissionOrList) ? permissionOrList : [permissionOrList];
  const hasPermission = required.some((perm) => user.permissions.has(perm));
  if (!hasPermission) {
    throw new AuthorizationError(`Requires permission: ${required.join(' or ')}`);
  }
}

export function requireRole(user, roleOrList) {
  if (!user) {
    throw new AuthenticationError();
  }
  const required = Array.isArray(roleOrList) ? roleOrList : [roleOrList];
  if (!required.some((role) => user.roles.includes(role))) {
    throw new AuthorizationError(`Requires role: ${required.join(' or ')}`);
  }
}
