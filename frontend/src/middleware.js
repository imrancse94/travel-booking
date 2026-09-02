import { NextResponse } from 'next/server';

/**
 * Server-side route protection.
 *
 * This is the first line of defence and the reason the app no longer flashes a
 * protected page before bouncing to /login: an unauthenticated request is
 * redirected before a single byte of that page's JS is sent. The AuthGate /
 * PermissionGate components remain as an in-render backstop.
 *
 * It also owns the token refresh. The access cookie deliberately expires with
 * the token it carries (15 minutes), and a server component cannot set cookies
 * -- only middleware and route handlers can. So when the access cookie has
 * lapsed but the 7-day refresh cookie has not, this exchanges it and writes the
 * new pair onto the response. Without that, a page reload 15 minutes after
 * signing in would log the user out.
 */
const PROTECTED = [
  /^\/admin(\/|$)/,
  /^\/checkout(\/|$)/,
  /^\/booking-confirmation(\/|$)/,
  /^\/my-bookings(\/|$)/,
  /^\/my-invoices(\/|$)/,
  /^\/profile(\/|$)/,
];

const API_BASE = process.env.API_INTERNAL_URL || 'http://localhost:4000/api/v1';

function loginRedirect(req) {
  const target = req.nextUrl.pathname + (req.nextUrl.search || '');
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?from=${encodeURIComponent(target)}`;
  return NextResponse.redirect(url);
}

/** `name=value` from a Set-Cookie header, ignoring its attributes. */
function parseCookiePair(setCookie) {
  const [pair] = String(setCookie).split(';');
  const idx = pair.indexOf('=');
  if (idx === -1) return null;
  return { name: pair.slice(0, idx).trim(), value: pair.slice(idx + 1).trim() };
}

export async function middleware(req) {
  if (!PROTECTED.some((pattern) => pattern.test(req.nextUrl.pathname))) {
    return NextResponse.next();
  }

  if (req.cookies.get('accessToken')?.value) {
    return NextResponse.next();
  }

  const refreshToken = req.cookies.get('refreshToken')?.value;
  if (!refreshToken) return loginRedirect(req);

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `refreshToken=${refreshToken}` },
      body: '{}',
      cache: 'no-store',
    });
    if (!res.ok) return loginRedirect(req);

    const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];

    // The new token has to be applied in BOTH directions.
    //
    // Onto the REQUEST, because the server components rendering this very
    // request read request cookies -- without this the page that triggered the
    // refresh still renders signed out, and the session only appears on the
    // next navigation.
    for (const cookie of setCookies) {
      const pair = parseCookiePair(cookie);
      if (pair) req.cookies.set(pair.name, pair.value);
    }

    // And onto the RESPONSE, so the browser keeps it. Forwarding the backend's
    // own Set-Cookie preserves its flags (httpOnly, sameSite, secure, max-age)
    // rather than re-deriving them here and risking a mismatch.
    const out = NextResponse.next({ request: req });
    for (const cookie of setCookies) {
      out.headers.append('set-cookie', cookie);
    }
    return out;
  } catch {
    return loginRedirect(req);
  }
}

export const config = {
  // Skips static assets and image optimisation, which never need a session.
  matcher: ['/((?!_next/static|_next/image|favicon.svg|favicon.ico).*)'],
};
