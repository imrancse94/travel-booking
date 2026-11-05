import { cookies, headers } from 'next/headers';
import { getUserFromAccessToken } from '../middleware/withAuth.js';
import { AuthenticationError } from '../utils/errors.js';

/**
 * server/lib/rateLimit.js's limiters take a `request`-shaped object and read
 * `request.headers.get(...)`; a Server Action has no `request`, only
 * `next/headers`'s `headers()` (itself already a Headers-like object with
 * `.get()`), so this just gives the limiter something with a `.headers`
 * property to match the shape it expects -- no change needed to rateLimit.js.
 */
export async function getActionRequestLike() {
  return { headers: await headers() };
}

/**
 * server/lib/authCookies.js's setAuthCookies/clearAuthCookies were written
 * against a NextResponse (`response.cookies.set(...)`), for Route Handlers.
 * next/headers's cookies() store already has that same `.set(name, value,
 * options)` method directly on it (no `.cookies` nesting) -- this just
 * reshapes it to match, so the same two functions work unchanged from a
 * Server Action instead of needing an action-specific copy.
 */
export async function getActionCookieResponse() {
  const store = await cookies();
  return { cookies: store };
}

/**
 * A Server Action has no `request` object to read a Bearer header or cookies
 * from the way a Route Handler's `withAuth(request)` does -- it runs in the
 * same server-component-ish context as lib/session.js, which resolves the
 * session from `next/headers`'s `cookies()` instead. Same underlying check
 * (`getUserFromAccessToken`), just a different way of getting the token.
 *
 * Throws AuthenticationError when signed out or the token is invalid/expired
 * -- every action requires a session (there is no "optional auth" action
 * today), so this is the one every action calls at the top, same as
 * `withAuth(request)` in a Route Handler.
 */
export async function requireActionUser() {
  const store = await cookies();
  const token = store.get('accessToken')?.value;
  if (!token) throw new AuthenticationError('No authentication token provided');
  return getUserFromAccessToken(token);
}
