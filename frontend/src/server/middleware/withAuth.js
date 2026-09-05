import { jwtService } from '../lib/JwtService.js';
import { env } from '../config/env.js';
import * as userRepository from '../repositories/userRepository.js';
import { AuthenticationError } from '../utils/errors.js';

/**
 * Replaces Express's `authenticate`/`optionalAuthenticate` middleware. A Route
 * Handler has no `req.user`/`next()` to attach state to and pass along, so
 * this is a plain function a handler calls itself, at the top, and gets back
 * the same `{ id, email, firstName, lastName, agencyId, roles, permissions }`
 * shape `req.user` used to be -- everything downstream (withPermission,
 * services that take an actor id) is unchanged by the framework swap.
 */
function extractToken(request) {
  const header = request.headers.get('authorization');
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  const cookie = request.cookies?.get('accessToken')?.value;
  return cookie || null;
}

/** Flattens the nested userRoles -> role -> rolePermissions -> permission rows. */
function grantsOf(user) {
  return {
    roles: user.userRoles.map((ur) => ur.role.name),
    permissions: new Set(user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name))),
  };
}

/** Throws AuthenticationError if there is no valid, active session. */
export async function withAuth(request) {
  const token = extractToken(request);
  if (!token) {
    throw new AuthenticationError('No authentication token provided');
  }

  let payload;
  try {
    payload = jwtService.verify(token, env.jwt.secret);
  } catch (err) {
    throw new AuthenticationError(
      err.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid authentication token'
    );
  }

  const user = await userRepository.findByIdWithPermissions(payload.sub);
  if (!user || user.status !== 'active') {
    throw new AuthenticationError('Account is no longer active');
  }

  const { roles, permissions } = grantsOf(user);
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    agencyId: user.agencyId,
    roles,
    permissions,
  };
}

/** Same as withAuth, but returns null instead of throwing when signed out. */
export async function withOptionalAuth(request) {
  try {
    return await withAuth(request);
  } catch {
    return null;
  }
}
