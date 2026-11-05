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

/**
 * Flattens the nested userRoles -> role -> rolePermissions -> permission rows.
 *
 * A plain deduped array, not a Set: this object crosses the JSON boundary
 * whenever a Route Handler returns it (e.g. GET /auth/me), and `JSON.stringify`
 * turns a Set into `{}` -- silently dropping every permission on the wire.
 * withPermission.js checks membership with `.includes`, which on a handful of
 * permission strings costs nothing next to the DB round-trip that produced them.
 */
function grantsOf(user) {
  return {
    roles: user.userRoles.map((ur) => ur.role.name),
    permissions: [...new Set(user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name)))],
  };
}

/**
 * The actual token -> user resolution, independent of how the token was
 * obtained. Shared by withAuth (a Route Handler's `request`) and
 * lib/session.js (a server component's `cookies()`, which has no `request`
 * to extract from) so both stay a single in-process call, not an HTTP
 * round-trip to this same server.
 */
export async function getUserFromAccessToken(token) {
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

/** Throws AuthenticationError if there is no valid, active session. */
export async function withAuth(request) {
  return getUserFromAccessToken(extractToken(request));
}

/** Same as withAuth, but returns null instead of throwing when signed out. */
export async function withOptionalAuth(request) {
  try {
    return await withAuth(request);
  } catch {
    return null;
  }
}
