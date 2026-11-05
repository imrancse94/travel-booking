import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, disconnectDb } from './index.js';
import logger from '../config/logger.js';

const MIGRATIONS_FOLDER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Replaces `prisma migrate deploy`.
 *
 * The first migration was produced by `drizzle-kit pull` against a database
 * Prisma had already built, so it is a full CREATE of the current schema.
 * Running it against one of those databases would fail on the first
 * `CREATE TYPE`. So before migrating, an already-populated database with no
 * Drizzle ledger is baselined: every journal entry is recorded as applied
 * without executing it. A fresh database has no `users` table, gets no
 * baseline, and has the whole schema created normally.
 */
async function baselineExistingDatabase() {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const applied = await db.execute(sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`);
  if (applied.rows[0].count > 0) return false;

  const existing = await db.execute(sql`SELECT to_regclass('public.users') IS NOT NULL AS has_schema`);
  if (!existing.rows[0].has_schema) return false;

  const journal = JSON.parse(fs.readFileSync(path.join(MIGRATIONS_FOLDER, 'meta', '_journal.json'), 'utf8'));
  for (const entry of journal.entries) {
    const file = fs.readFileSync(path.join(MIGRATIONS_FOLDER, `${entry.tag}.sql`), 'utf8');
    // The same hash the migrator computes, so it treats this as applied.
    const hash = crypto.createHash('sha256').update(file).digest('hex');
    // eslint-disable-next-line no-await-in-loop -- a handful of rows, in order
    await db.execute(sql`
      INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") VALUES (${hash}, ${entry.when})
    `);
  }

  logger.info({ entries: journal.entries.length }, 'Baselined an existing database into the Drizzle migration ledger');
  return true;
}

export async function runMigrations() {
  await baselineExistingDatabase();
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

// `node src/db/migrate.js` -- the deploy step.
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(() => logger.info('Migrations are up to date'))
    .catch((err) => {
      logger.error({ err }, 'Migration failed');
      process.exitCode = 1;
    })
    .finally(() => disconnectDb());
}
