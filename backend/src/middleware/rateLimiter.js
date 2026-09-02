import rateLimit from 'express-rate-limit';
import { failure } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

function handler(req, res) {
  return failure(res, { message: 'Too many requests, please try again later', statusCode: 429 });
}

/**
 * Rate limiting is off under NODE_ENV=test.
 *
 * These limiters keep their counters in module-level memory, so under Jest's
 * --runInBand every suite shares one budget. bookingLimiter allows 30 requests
 * a minute across POST /bookings and POST /payments, and the concurrency suite
 * alone fires ten simultaneous bookings -- so whether it passed depended on how
 * much of the budget earlier suites had already spent and how fast they ran.
 * That surfaced the moment those tests got an explicit timeout: they stopped
 * timing out, finished sooner, and landed inside the same 60s window as the
 * suites before them, and every booking came back 429.
 *
 * Nothing asserts the 429 path today, so no coverage is lost -- but that also
 * means the limits are now entirely untested. If they ever need covering, do it
 * with a dedicated suite that constructs its own limiter rather than by leaving
 * these armed for every other suite.
 */
const skipInTests = () => env.isTest;

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skip: skipInTests,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skip: skipInTests,
  skipSuccessfulRequests: true,
});

export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skip: skipInTests,
});
