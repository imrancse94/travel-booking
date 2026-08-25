import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import logger from './logger.js';
import { sqlLogger } from './sqlLogger.js';

const globalForPrisma = globalThis;

function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  });

  client.$on('query', (e) => {
    sqlLogger.info({ query: e.query, params: e.params, durationMs: e.duration }, 'sql.query');
  });
  client.$on('warn', (e) => logger.warn({ message: e.message }, 'prisma.warn'));
  client.$on('error', (e) => logger.error({ message: e.message }, 'prisma.error'));

  return client;
}

export const prisma = globalForPrisma.__prisma || createPrismaClient();

if (!env.isProduction) {
  globalForPrisma.__prisma = prisma;
}

export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
