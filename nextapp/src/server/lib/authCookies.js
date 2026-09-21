import { env } from '../config/env.js';

const REFRESH_COOKIE = 'refreshToken';
const ACCESS_COOKIE = 'accessToken';

const BASE_COOKIE_OPTIONS = {
  // httpOnly keeps the token out of reach of injected scripts; sameSite:
  // 'lax' is what stops a cross-site form from riding along.
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

const ACCESS_COOKIE_OPTIONS = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: durationToMs(env.jwt.expiresIn, 15 * 60 * 1000),
};

/** Sets the httpOnly auth cookies on a NextResponse, mirroring the old Express controller. */
export function setAuthCookies(response, { accessToken, refreshToken } = {}) {
  if (accessToken) response.cookies.set(ACCESS_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS);
  if (refreshToken) response.cookies.set(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
}

export function clearAuthCookies(response) {
  response.cookies.set(ACCESS_COOKIE, '', { ...BASE_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, '', { ...BASE_COOKIE_OPTIONS, maxAge: 0 });
}

export function getRefreshCookie(request) {
  return request.cookies.get(REFRESH_COOKIE)?.value || null;
}
