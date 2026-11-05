import crypto from 'node:crypto';
import * as roleRepository from '../repositories/roleRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { env } from '../config/env.js';
import { bcryptHasher } from '../lib/BcryptHasher.js';
import { jwtService } from '../lib/JwtService.js';
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { ROLES } from '../config/permissions.js';
import { sendTemplateEmail } from './emailService.js';
import { recordAudit } from './auditService.js';

function signAccessToken(user) {
  return jwtService.sign({ sub: user.id }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

function signRefreshToken(user) {
  return jwtService.sign({ sub: user.id, type: 'refresh' }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshTokenHash = await bcryptHasher.hash(refreshToken);
  await userRepository.updateAuthFields(user.id, { refreshTokenHash, lastLoginAt: new Date() });
  return { accessToken, refreshToken };
}

function sanitizeUser(user) {
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, refreshTokenHash, emailVerifyToken, passwordResetToken, ...safe } = user;
  return safe;
}

export async function register({ firstName, lastName, email, phone, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new ConflictError('An account with this email already exists');

  const passwordHash = await bcryptHasher.hash(password);
  const emailVerifyToken = crypto.randomBytes(32).toString('hex');

  const customerRole = await roleRepository.findRoleByName(ROLES.CUSTOMER);

  const user = await userRepository.createCustomerAccount(
    {
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      emailVerifyToken,
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    { roleId: customerRole?.id, customer: { firstName, lastName, email, phone } }
  );

  await sendTemplateEmail('welcome', email, { firstName }).catch(() => {});
  await sendTemplateEmail('emailVerification', email, {
    firstName,
    verifyUrl: `${env.publicUrl}/verify-email?token=${emailVerifyToken}`,
  }).catch(() => {});

  return sanitizeUser(user);
}

export async function login({ email, password }, requestMeta = {}) {
  const user = await userRepository.findByEmailWithPermissions(email);

  if (!user || user.deletedAt) {
    throw new AuthenticationError('Invalid email or password');
  }
  if (user.status !== 'active') {
    throw new AuthenticationError('Account is inactive, contact an administrator');
  }

  const valid = await bcryptHasher.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Invalid email or password');
  }

  const tokens = await issueTokenPair(user);
  await recordAudit({ userId: user.id, action: 'auth.login', entity: 'User', entityId: user.id, ...requestMeta });

  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = [...new Set(user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name)))];

  return { user: { ...sanitizeUser(user), roles, permissions }, ...tokens };
}

export async function refreshTokens(refreshToken) {
  let payload;
  try {
    payload = jwtService.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw new AuthenticationError('Invalid or expired refresh token');
  }
  if (payload.type !== 'refresh') {
    throw new AuthenticationError('Invalid token type');
  }

  const user = await userRepository.findRawById(payload.sub);
  if (!user || !user.refreshTokenHash || user.deletedAt || user.status !== 'active') {
    throw new AuthenticationError('Session no longer valid');
  }

  const matches = await bcryptHasher.compare(refreshToken, user.refreshTokenHash);
  if (!matches) {
    throw new AuthenticationError('Session no longer valid');
  }

  return issueTokenPair(user);
}

export async function logout(userId) {
  await userRepository.updateAuthFields(userId, { refreshTokenHash: null });
}

export async function requestPasswordReset(email) {
  const user = await userRepository.findByEmail(email);
  if (!user) return; // Do not leak account existence.

  const token = crypto.randomBytes(32).toString('hex');
  await userRepository.updateAuthFields(user.id, {
    passwordResetToken: token,
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
  });

  await sendTemplateEmail('passwordReset', email, {
    firstName: user.firstName,
    resetUrl: `${env.publicUrl}/reset-password?token=${token}`,
  }).catch(() => {});
}

export async function resetPassword({ token, newPassword }) {
  const user = await userRepository.findByLiveToken('passwordResetToken', token);
  if (!user) throw new ValidationError('Password reset token is invalid or has expired');

  const passwordHash = await bcryptHasher.hash(newPassword);
  await userRepository.updateAuthFields(user.id, {
    passwordHash,
    passwordResetToken: null,
    passwordResetExpires: null,
    refreshTokenHash: null,
  });
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userRepository.findRawById(userId);
  if (!user) throw new NotFoundError('User not found');

  const valid = await bcryptHasher.compare(currentPassword, user.passwordHash);
  if (!valid) throw new ValidationError('Current password is incorrect');

  const passwordHash = await bcryptHasher.hash(newPassword);
  await userRepository.updateAuthFields(userId, { passwordHash, refreshTokenHash: null });
}

export async function verifyEmail(token) {
  const user = await userRepository.findByLiveToken('emailVerifyToken', token);
  if (!user) throw new ValidationError('Email verification token is invalid or has expired');

  await userRepository.updateAuthFields(user.id, {
    isEmailVerified: true,
    emailVerifyToken: null,
    emailVerifyExpires: null,
  });
}

export { sanitizeUser };
