import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created } from '../utils/apiResponse.js';
import { AuthenticationError } from '../utils/errors.js';
import { env } from '../config/env.js';
import * as authService from '../services/authService.js';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
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
  setRefreshCookie(res, refreshToken);
  return success(res, { data: { user, accessToken }, message: 'Login successful' });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AuthenticationError('No refresh token provided');

  const { accessToken, refreshToken } = await authService.refreshTokens(token);
  setRefreshCookie(res, refreshToken);
  return success(res, { data: { accessToken }, message: 'Token refreshed' });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await authService.logout(req.user.id);
  }
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
