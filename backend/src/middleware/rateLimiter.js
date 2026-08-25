import rateLimit from 'express-rate-limit';
import { failure } from '../utils/apiResponse.js';

function handler(req, res) {
  return failure(res, { message: 'Too many requests, please try again later', statusCode: 429 });
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skipSuccessfulRequests: true,
});

export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
