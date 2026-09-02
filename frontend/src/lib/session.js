import { cookies } from 'next/headers';

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
 * The browser cannot reach the API by container name, and a server component
 * cannot use a relative URL, so the two have different base URLs by necessity.
 */
const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:4000/api/v1';

export async function getSession() {
  const store = await cookies();
  const accessToken = store.get('accessToken')?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Cookie: `accessToken=${accessToken}` },
      // Never cached: this is per-request, per-user data.
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data ?? null;
  } catch {
    // A backend that is down must not take the whole page down with it; the
    // visitor is simply treated as signed out.
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
