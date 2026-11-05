// Container healthcheck: exits 0 only when the app answers AND can reach its
// database and Redis. Used by the Dockerfile HEALTHCHECK and docker-compose.
// (A plain GET /api/v1/health stays green even when Postgres is down, which
// would let Coolify route traffic to a container that cannot serve requests.)
const base = `http://127.0.0.1:${process.env.PORT || 5173}`;
const checks = ['/api/v1/health', '/api/v1/health/db', '/api/v1/health/redis'];

const results = await Promise.all(
  checks.map(async (path) => {
    try {
      const res = await fetch(base + path, { signal: AbortSignal.timeout(4000) });
      return res.ok ? null : `${path} -> HTTP ${res.status}`;
    } catch (err) {
      return `${path} -> ${err.cause?.code || err.name}`;
    }
  })
);

const failed = results.filter(Boolean);
if (failed.length > 0) {
  console.error(`unhealthy: ${failed.join('; ')}`);
  process.exit(1);
}
