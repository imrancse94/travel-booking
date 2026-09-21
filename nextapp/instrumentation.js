/**
 * Next's supported hook for one-time startup code in a long-running server
 * (this app deploys as a persistent Docker container, not serverless, so
 * `register()` runs exactly once per process). Replaces the
 * `startBookingHoldSweeper()` call that used to live in backend/src/server.js
 * -- there is no separate backend process anymore, so this Next server is the
 * only place left to own it.
 *
 * Guarded to the Node runtime: `register()` also fires for the Edge runtime
 * (middleware), which can't import the Drizzle/pg stack the job needs, and
 * would otherwise start a duplicate sweeper.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { startBookingHoldSweeper } = await import('./src/server/jobs/holdExpiryJob.js');
  startBookingHoldSweeper();
}
