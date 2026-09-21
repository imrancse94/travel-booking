import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

/**
 * Replaces `express-rate-limit`. This app deploys as one long-running Docker
 * container (not serverless), so `express-rate-limit`'s assumption --
 * in-memory counters shared across requests in a single Node process -- still
 * holds; there is no need for a Redis-backed store to make this correct here.
 *
 * A fixed window per key (IP + limiter name), same as express-rate-limit's
 * default. Not persisted anywhere -- a restart clears every counter, exactly
 * like the Express version did.
 *
 * Simplification versus the old `authLimiter`: that one had
 * `skipSuccessfulRequests: true` (only failed logins counted toward the
 * quota), which needs a post-response hook to un-count a success. A
 * legitimate user logging in >20 times in 15 minutes is an edge case, not a
 * correctness requirement, so this counts every request, successful or not.
 */
const buckets = new Map();

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429);
  }
}

/**
 * `createLimiter({ windowMs, limit })` returns `enforce(request, name)`,
 * called at the top of a route handler the same way `bookingLimiter` etc.
 * were mounted in Express -- throws TooManyRequestsError over the limit.
 */
export function createLimiter({ windowMs, limit }) {
  return function enforce(request, name) {
    if (env.isTest) return;

    const key = `${name}:${getClientIp(request)}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      buckets.set(key, { count: 1, windowStart: now });
      return;
    }

    if (bucket.count >= limit) {
      throw new TooManyRequestsError();
    }
    bucket.count += 1;
  };
}

export const generalLimit = createLimiter({ windowMs: 15 * 60 * 1000, limit: 300 });
export const authLimit = createLimiter({ windowMs: 15 * 60 * 1000, limit: 20 });
export const bookingLimit = createLimiter({ windowMs: 60 * 1000, limit: 30 });
