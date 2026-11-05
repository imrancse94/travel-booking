import { NextRequest } from 'next/server';

/**
 * Calls a Next.js Route Handler (the exported GET/POST/PUT/DELETE function
 * from an `app/api/**\/route.js` file) the way a real HTTP request would,
 * without spinning up a server -- mirroring what Supertest did against the
 * old Express `app` instance in backend/tests.
 *
 * `handler` is the exported function itself (e.g. the `POST` from
 * `bookings/route.js`). `path` is the route's pathname (only used to build a
 * realistic URL; Next.js route handlers don't re-derive params from it --
 * those come from `routeParams` below, matching how Next itself calls a
 * dynamic segment's handler).
 *
 * Returns `{ status, body, headers, response }`:
 *   - `body` is the parsed JSON body (undefined if the response isn't JSON,
 *     e.g. a PDF -- use `response` directly for those).
 *   - `headers` is the response's Headers object.
 */
export async function callRoute(
  handler,
  { method = 'GET', path = '/', query, headers = {}, body, cookies, routeParams } = {}
) {
  const url = new URL(path, 'http://localhost');
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const reqHeaders = new Headers(headers);
  let requestBody;
  if (body !== undefined) {
    reqHeaders.set('content-type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  const request = new NextRequest(url, {
    method,
    headers: reqHeaders,
    body: requestBody,
  });

  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      request.cookies.set(name, value);
    }
  }

  const ctx = routeParams ? { params: Promise.resolve(routeParams) } : undefined;
  const response = await handler(request, ctx);

  const contentType = response.headers.get('content-type') || '';
  let parsedBody;
  if (contentType.includes('application/json')) {
    parsedBody = await response.json();
  }

  return { status: response.status, body: parsedBody, headers: response.headers, response };
}

/** Shorthand for building an `Authorization: Bearer <token>` header. */
export function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}
