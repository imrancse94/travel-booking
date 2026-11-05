'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser, getActionRequestLike, getActionCookieResponse } from './_actionAuth.js';
import { setAuthCookies, clearAuthCookies } from '../lib/authCookies.js';
import { authLimit } from '../lib/rateLimit.js';
import { parse } from '../lib/parseRequest.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validators.js';
import * as authService from '../services/authService.js';

/**
 * Mirrors app/api/v1/auth/login/route.js. A Server Action can call
 * `cookies().set()` the same as a Route Handler -- no `applyCookies`
 * indirection needed here, that trick exists only because apiHandler.js
 * builds the NextResponse *after* the handler returns.
 */
export async function loginAction(email, password) {
  return withActionResult(async () => {
    authLimit(await getActionRequestLike(), 'auth');
    const body = parse('body', { email, password }, loginSchema);

    const { user, accessToken, refreshToken } = await authService.login(body, {
      // No request in a Server Action to read a forwarded-for header from;
      // login rate limiting still applies (authLimit above, keyed by the
      // same header when present), this is just the audit-log IP field.
      ipAddress: 'server-action',
      userAgent: null,
    });

    setAuthCookies(await getActionCookieResponse(), { accessToken, refreshToken });

    // accessToken goes back to the client too: AuthContext still feeds it to
    // tokenStore.js so the client-side reads (which stay on services/*.js)
    // keep sending it as a Bearer header, same as before this migration.
    return { user, accessToken };
  });
}

export async function registerAction(payload) {
  return withActionResult(async () => {
    authLimit(await getActionRequestLike(), 'auth');
    const body = parse('body', payload, registerSchema);
    return authService.register(body);
  });
}

export async function logoutAction() {
  return withActionResult(async () => {
    const user = await requireActionUser().catch(() => null);
    if (user) await authService.logout(user.id);

    clearAuthCookies(await getActionCookieResponse());
    return null;
  });
}

export async function forgotPasswordAction(email) {
  return withActionResult(async () => {
    authLimit(await getActionRequestLike(), 'auth');
    const body = parse('body', { email }, forgotPasswordSchema);
    await authService.requestPasswordReset(body.email);
    return null;
  });
}

export async function resetPasswordAction(token, newPassword) {
  return withActionResult(async () => {
    authLimit(await getActionRequestLike(), 'auth');
    const body = parse('body', { token, newPassword }, resetPasswordSchema);
    await authService.resetPassword(body);
    return null;
  });
}

export async function changePasswordAction(currentPassword, newPassword) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    const body = parse('body', { currentPassword, newPassword }, changePasswordSchema);
    await authService.changePassword(user.id, body);
    return null;
  });
}
