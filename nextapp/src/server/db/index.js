import { env } from '../config/env.js';
import { DrizzleClient } from '../lib/DrizzleClient.js';
import * as schema from './schema.js';

/**
 * The one instance of DrizzleClient the whole app shares (a fresh Pool per
 * request would exhaust Postgres's connection limit almost immediately).
 * Every repository still imports `db`/`pool` from this module exactly as
 * before -- only the construction moved into the DrizzleClient wrapper.
 */
const drizzleClient = new DrizzleClient({
  connectionString: env.databaseUrl,
  max: env.databasePoolMax,
  isTest: env.isTest,
});

export const pool = drizzleClient.pool;
export const db = drizzleClient.db;

export async function checkDatabaseConnection() {
  return drizzleClient.checkConnection();
}

export async function connectDb() {
  return drizzleClient.connect();
}

export async function disconnectDb() {
  return drizzleClient.disconnect();
}

export { schema };
