import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { AppError } from '../utils/errors.js';
import { failure } from '../utils/apiResponse.js';
import { mapDbError } from '../utils/dbError.js';

export function notFoundHandler(req, res) {
  return failure(res, { message: `Route not found: ${req.method} ${req.originalUrl}`, statusCode: 404 });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
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
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
    },
    'Request error'
  );

  if (!isOperational && env.isProduction) {
    message = 'Internal server error';
    errors = [];
  }

  return failure(res, { message, statusCode, errors });
}
