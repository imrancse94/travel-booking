import { and, count, gte, lt, sql } from 'drizzle-orm';
import { bookings, invoices, tourBookings } from '../db/schema.js';

// Generates human-friendly, unique numbers like BK-2026-000001.
//
// Must be called from inside the same transaction that creates the row. It
// takes a Postgres advisory transaction lock keyed by "<namespace>:<year>" so
// concurrent transactions serialize around the counter instead of racing on the
// same next number; the lock releases when the transaction commits or rolls back.

// Prisma allowed `tx[namespace]` to reach a model by name; Drizzle tables are
// values, so the namespaces map to them explicitly.
const TABLES = { booking: bookings, tourBooking: tourBookings, invoice: invoices };

export async function generateSequentialNumber(tx, { prefix, namespace, year = new Date().getFullYear(), digits = 6 }) {
  const table = TABLES[namespace];
  if (!table) throw new Error(`No table registered for sequential namespace "${namespace}"`);

  const lockNamespace = `${namespace}:${year}`;
  // Parameterised, so the namespace cannot be interpolated into the statement.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockNamespace}, 0))`);

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  const [{ value }] = await tx
    .select({ value: count() })
    .from(table)
    .where(and(gte(table.createdAt, yearStart), lt(table.createdAt, yearEnd)));

  const sequence = String(Number(value) + 1).padStart(digits, '0');
  return `${prefix}-${year}-${sequence}`;
}

export async function generateBookingNumber(tx) {
  return generateSequentialNumber(tx, { prefix: 'BK', namespace: 'booking' });
}

export async function generateTourBookingNumber(tx) {
  return generateSequentialNumber(tx, { prefix: 'TB', namespace: 'tourBooking' });
}

export async function generateInvoiceNumber(tx) {
  return generateSequentialNumber(tx, { prefix: 'INV', namespace: 'invoice' });
}
