import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created } from '../utils/apiResponse.js';
import { AuthenticationError } from '../utils/errors.js';
import { env } from '../config/env.js';
import * as authService from '../services/authService.js';

const REFRESH_COOKIE = 'refreshToken';
const ACCESS_COOKIE = 'accessToken';

const BASE_COOKIE_OPTIONS = {
  // httpOnly keeps the token out of reach of injected scripts, which is
  // strictly better than the previous in-memory copy that any XSS could read.
  // sameSite: 'lax' is what stops a cross-site form from riding along.
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  path: '/',
};

const REFRESH_COOKIE_OPTIONS = { ...BASE_COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 };

/** '15m' | '2h' | '7d' | '30s' -> milliseconds. */
function durationToMs(value, fallbackMs) {
  const match = /^(\d+)\s*([smhd])$/.exec(String(value || '').trim());
  if (!match) return fallbackMs;
  const n = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return n * unit;
}

/**
 * The access cookie expires WITH the token it carries. When it lapses the
 * browser simply stops sending it, and the caller (the Next middleware, or the
 * SPA) exchanges the still-valid refresh cookie for a new one -- which is
 * cleaner than transmitting a token already known to be expired.
 */
const ACCESS_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: durationToMs(env.jwt.expiresIn, 15 * 60 * 1000),
};

function setAuthCookies(res, { accessToken, refreshToken }) {
  if (accessToken) res.cookie(ACCESS_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS);
  if (refreshToken) res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
}

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  return created(res, user, 'Account created. Please check your email to verify your address.');
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  setAuthCookies(res, { accessToken, refreshToken });
  // accessToken stays in the body as well: non-browser clients (and the
  // existing integration tests) authenticate with a Bearer header.
  return success(res, { data: { user, accessToken }, message: 'Login successful' });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AuthenticationError('No refresh token provided');

  const { accessToken, refreshToken } = await authService.refreshTokens(token);
  setAuthCookies(res, { accessToken, refreshToken });
  return success(res, { data: { accessToken }, message: 'Token refreshed' });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await authService.logout(req.user.id);
  }
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  return success(res, { message: 'Logged out' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  return success(res, { message: 'If an account exists for this email, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  return success(res, { message: 'Password has been reset. Please log in.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  return success(res, { message: 'Password changed' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  return success(res, { message: 'Email verified' });
});

export const me = asyncHandler(async (req, res) => {
  return success(res, { data: req.user });
});
