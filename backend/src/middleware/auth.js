import { jwtService } from '../lib/JwtService.js';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AuthenticationError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
}

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
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

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
  });

  if (!user || user.deletedAt || user.status !== 'active') {
    throw new AuthenticationError('Account is no longer active');
  }

  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = new Set(
    user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name))
  );

  req.user = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    agencyId: user.agencyId,
    roles,
    permissions,
  };

  next();
});

// Attaches req.user if a valid token is present, but never rejects the request.
export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwtService.verify(token, env.jwt.secret);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
    });
    if (user && !user.deletedAt && user.status === 'active') {
      req.user = {
        id: user.id,
        email: user.email,
        roles: user.userRoles.map((ur) => ur.role.name),
        permissions: new Set(user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name))),
      };
    }
  } catch {
    // ignore invalid token in optional auth
  }
  next();
});
