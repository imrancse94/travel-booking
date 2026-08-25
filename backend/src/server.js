import { createApp } from './app.js';
import { env } from './config/env.js';
import logger from './config/logger.js';
import { prisma } from './config/prisma.js';
import { getRedisClient } from './config/redis.js';
import { startBookingHoldSweeper } from './jobs/holdExpiryJob.js';

const app = createApp();
let server;
let stopHoldSweeper;

async function start() {
  await prisma.$connect();
  logger.info('Connected to PostgreSQL');

  getRedisClient();

  server = app.listen(env.port, () => {
    logger.info(`API server listening on port ${env.port} (${env.nodeEnv})`);
    logger.info(`Docs available at http://localhost:${env.port}/api-docs`);
  });

  stopHoldSweeper = startBookingHoldSweeper();
}

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  if (stopHoldSweeper) stopHoldSweeper();

  const timeout = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await prisma.$disconnect();
    const redis = getRedisClient();
    redis.disconnect();
    clearTimeout(timeout);
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    clearTimeout(timeout);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
