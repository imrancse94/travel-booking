import { AuthenticationError, AuthorizationError } from '../utils/errors.js';

// requirePermission('bookings.create') or requirePermission(['bookings.view', 'bookings.update']) for ANY match.
export function requirePermission(permissionOrList) {
  const required = Array.isArray(permissionOrList) ? permissionOrList : [permissionOrList];

  return function permissionGuard(req, res, next) {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    if (req.user.roles.includes('Super Admin')) {
      return next();
    }

    const hasPermission = required.some((perm) => req.user.permissions.has(perm));
    if (!hasPermission) {
      return next(new AuthorizationError(`Requires permission: ${required.join(' or ')}`));
    }

    next();
  };
}

export function requireRole(roleOrList) {
  const required = Array.isArray(roleOrList) ? roleOrList : [roleOrList];

  return function roleGuard(req, res, next) {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    if (!required.some((role) => req.user.roles.includes(role))) {
      return next(new AuthorizationError(`Requires role: ${required.join(' or ')}`));
    }
    next();
  };
}
