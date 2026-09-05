import { NextResponse } from 'next/server';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { AppError } from '../utils/errors.js';
import { mapDbError } from '../utils/dbError.js';
import { success } from './apiResponse.js';

/**
 * Replaces Express's global `errorHandler`/`notFoundHandler` middleware, which
 * has no equivalent for Route Handlers -- each one is its own isolated
 * function, so each needs its own try/catch. `apiHandler` is that catch,
 * written once.
 *
 * Wrap every exported route function with it:
 *
 *   export const GET = apiHandler(async (request, ctx) => {
 *     const user = await withAuth(request);
 *     requirePermission(user, 'hotels.view');
 *     const items = await hotelService.list(...);
 *     return success({ data: items });
 *   });
 *
 * The handler returns a `{ body, statusCode }` descriptor (see
 * apiResponse.js's success/created/paginated) rather than building a
 * NextResponse itself -- that keeps route handlers focused on the actual
 * logic, the same way controllers only ever called `success(res, ...)` and
 * never touched `res.status().json()` directly.
 */
export function apiHandler(handler) {
  return async function wrapped(request, ctx) {
    try {
      const result = await handler(request, ctx);
      const { body, statusCode } = result?.body ? result : success({ data: result });
      return NextResponse.json(body, { status: statusCode });
    } catch (err) {
      return NextResponse.json(...toErrorResponse(err, request));
    }
  };
}

function toErrorResponse(err, request) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  const dbError = mapDbError(err, { isProduction: env.isProduction });
  if (dbError) {
    statusCode = dbError.statusCode;
    message = dbError.message;
  }

  const isOperational = err instanceof AppError || dbError !== null;

  logger.error(
    {
      err: { message: err.message, stack: env.isProduction ? undefined : err.stack },
      statusCode,
      path: request?.nextUrl?.pathname,
      method: request?.method,
    },
    'Request error'
  );

  if (!isOperational && env.isProduction) {
    message = 'Internal server error';
    errors = [];
  }

  return [{ success: false, message, errors }, { status: statusCode }];
}

/** For a route segment with no matching handler at all -- Next's own 404 already covers unmatched paths, so this is only for a deliberate "not implemented" response inside a route file that only exports some methods. */
export function notFound(request) {
  return NextResponse.json(
    { success: false, message: `Route not found: ${request.method} ${request.nextUrl.pathname}`, errors: [] },
    { status: 404 }
  );
}
