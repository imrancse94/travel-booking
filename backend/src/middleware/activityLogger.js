import { activityLogger } from '../config/activityLogger.js';
import { redact } from '../utils/redact.js';

// Reads are not activity: logging every GET would bury the actions that matter
// under list-page traffic.
const TRACKED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Endpoints whose bodies are nothing but credentials. The outcome is worth
// recording -- who signed in, from where, and whether it worked -- but the body
// is dropped entirely rather than trusted to redaction.
const CREDENTIAL_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/reset-password',
  '/auth/forgot-password',
  '/auth/change-password',
  '/auth/verify-email',
];

function isCredentialPath(url) {
  return CREDENTIAL_PATHS.some((p) => url.includes(p));
}

/** "created a booking" from POST /api/v1/bookings, for a readable log. */
function describe(method, url) {
  const verb = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' }[method] || method.toLowerCase();
  const resource = url.replace(/^.*\/api\/v\d+\//, '').split('?')[0].replace(/\/+$/, '');
  return `${verb} ${resource || '/'}`;
}

/**
 * Records one line per state-changing request, after the response is known so
 * the outcome is part of the record.
 *
 * Bodies go through redact(), which strips passwords, tokens and card data at
 * any depth -- see utils/redact.js.
 */
export function activityTracker(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    if (!TRACKED_METHODS.has(req.method)) return;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const credentialEndpoint = isCredentialPath(req.originalUrl || req.url);

    activityLogger.info({
      type: 'activity',
      action: describe(req.method, req.originalUrl || req.url),
      method: req.method,
      path: (req.originalUrl || req.url).split('?')[0],
      status: res.statusCode,
      outcome: res.statusCode < 400 ? 'success' : 'failure',
      durationMs: Math.round(durationMs),
      userId: req.user?.id ?? null,
      userEmail: req.user?.email ?? null,
      // authenticate() already flattens these to role names on req.user.
      roles: req.user?.roles ?? [],
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
      requestId: req.id ?? null,
      // Credential endpoints contribute no body at all; everything else is
      // redacted rather than omitted, so an admin can still see what changed.
      body: credentialEndpoint ? '[CREDENTIALS OMITTED]' : redact(req.body),
      params: redact(req.params),
      query: redact(req.query),
    });
  });

  next();
}

export default activityTracker;
