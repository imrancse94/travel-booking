import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { AppError } from '../utils/errors.js';
import { failure } from '../utils/apiResponse.js';

export function notFoundHandler(req, res) {
  return failure(res, { message: `Route not found: ${req.method} ${req.originalUrl}`, statusCode: 404 });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = `A record with this ${err.meta?.target?.join?.(', ') || 'value'} already exists`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else if (err.code === 'P2003') {
      statusCode = 409;
      message = 'This action violates a related record constraint';
    } else {
      statusCode = 400;
      message = 'Database request error';
    }
  }

  const isOperational = err instanceof AppError || err instanceof Prisma.PrismaClientKnownRequestError;

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
