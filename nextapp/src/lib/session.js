import { cookies } from 'next/headers';
import { getUserFromAccessToken } from '../server/middleware/withAuth.js';

/**
 * Server-side session. Importing this from a client component is a build error,
 * because next/headers only exists on the server -- which is the point: the
 * session is resolved once while rendering, not fetched again in the browser.
 *
 * Replaces the Redux store that used to hold { user, isLoading }. There is no
 * "restoring" state any more: by the time any component renders, the server
 * already knows whether there is a session, so the app no longer flashes a
 * signed-out header to a signed-in user.
 *
 * A server component runs in the same Node process as the Route Handlers, so
 * this calls the same token -> user resolution directly (getUserFromAccessToken)
 * instead of making an HTTP request to its own /auth/me endpoint -- one fewer
 * network hop and JSON round-trip per page render.
 */
export async function getSession() {
  const store = await cookies();
  const accessToken = store.get('accessToken')?.value;
  if (!accessToken) return null;

  try {
    return await getUserFromAccessToken(accessToken);
  } catch {
    // An expired/invalid token must not take the whole page down; the
    // visitor is simply treated as signed out (middleware handles refresh).
    return null;
  }
}

/** Mirrors the permission logic the client context exposes, for server components. */
export function sessionHasPermission(user, permission) {
  if (!user) return false;
  if (user.roles?.includes('Super Admin')) return true;
  return Boolean(user.permissions?.includes(permission));
}

export function sessionHasRole(user, role) {
  return Boolean(user?.roles?.includes(role));
}
