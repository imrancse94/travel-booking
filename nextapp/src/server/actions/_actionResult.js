import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { AppError } from '../utils/errors.js';
import { mapDbError } from '../utils/dbError.js';

/**
 * Server Action counterpart to server/lib/apiHandler.js. A Route Handler can
 * throw and let Next.js turn that into an HTTP error response; a Server
 * Action can't -- Next redacts a thrown error's message to a generic string
 * in production builds (it assumes any exception might leak internals to the
 * client bundle). So every action catches internally and returns this shape
 * instead of throwing; src/lib/callAction.js on the client turns a `{success:
 * false}` result back into a thrown Error with the same .message/.errors/
 * .statusCode shape ApiClient.js's normalizeError already produced, so
 * existing try/catch call sites don't need to change.
 */
export function actionSuccess(data, message = 'OK') {
  return { success: true, data, message, errors: [], statusCode: 200 };
}

export function actionFailure(err) {
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
    { err: { message: err.message, stack: env.isProduction ? undefined : err.stack }, statusCode },
    'Server Action error'
  );

  if (!isOperational && env.isProduction) {
    message = 'Internal server error';
    errors = [];
  }

  return { success: false, data: null, message, errors, statusCode };
}

/** Wraps an action body so every action is a one-line `try/catch` -- write `withActionResult(async () => {...})`. */
export async function withActionResult(fn) {
  try {
    const data = await fn();
    return actionSuccess(data);
  } catch (err) {
    return actionFailure(err);
  }
}
