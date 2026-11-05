import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { sqlLogger } from '../config/sqlLogger.js';
import * as schema from '../db/schema.js';
import * as relations from '../db/relations.js';

/**
 * Thin wrapper around `pg`'s Pool + `drizzle-orm`, matching the rest of
 * server/lib/ (BcryptHasher, JwtService, RedisClient, ...): application code
 * depends on this class, never on `pg`/`drizzle-orm` directly, so swapping
 * either out later touches one file instead of every repository.
 *
 * The pool size is explicit rather than inherited. createBooking takes a
 * pg_advisory_xact_lock for the life of its transaction, so N simultaneous
 * bookings hold N connections; sizing the pool from the CPU count instead
 * (as some ORMs default to) silently fell below that on a 4-core CI runner
 * and turned every concurrent booking into a pool timeout. Making it a
 * number someone can reason about -- and raise for a busier deployment --
 * avoids repeating that.
 */
export class DrizzleClient {
  constructor({ connectionString, max, isTest = false }) {
    this.pool = new pg.Pool({ connectionString, max });
    this.db = drizzle(this.pool, {
      schema: { ...schema, ...relations },
      // Columns are snake_case in Postgres and camelCase in the schema file.
      casing: 'snake_case',
      // Every statement goes to the dedicated SQL log; see config/sqlLogger.js.
      logger: isTest ? false : { logQuery: (query, params) => sqlLogger.info({ query, params }, 'sql.query') },
    });
  }

  /** Verifies the pool can reach Postgres. Used by GET /api/v1/health/db. */
  async checkConnection() {
    await this.db.execute(sql`SELECT 1`);
    return true;
  }

  async connect() {
    const client = await this.pool.connect();
    client.release();
  }

  async disconnect() {
    await this.pool.end();
  }
}
