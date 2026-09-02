import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';
import * as relations from './relations.js';

/**
 * Postgres pool and Drizzle client.
 *
 * The pool size is explicit rather than inherited. createBooking takes a
 * pg_advisory_xact_lock for the life of its transaction, so N simultaneous
 * bookings hold N connections; Prisma sized its pool from the CPU count
 * ((cores*2)+1), which silently fell below that on a 4-core CI runner and
 * turned every concurrent booking into a pool timeout. Making it a number
 * someone can reason about -- and raise for a busier deployment -- avoids
 * repeating that.
 */
export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: env.databasePoolMax,
});

export const db = drizzle(pool, {
  schema: { ...schema, ...relations },
  // Columns are snake_case in Postgres and camelCase in the schema file.
  casing: 'snake_case',
});

export async function disconnectDb() {
  await pool.end();
}

export { schema };
