import { and, count, desc, eq, gte, inArray, lte, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings, payments, refunds } from '../db/schema.js';

const withPaymentAndBooking = {
  payment: {
    with: {
      booking: { columns: { id: true, bookingNumber: true, currency: true, customerId: true } },
    },
  },
};

export async function findById(id) {
  const row = await db.query.refunds.findFirst({
    where: eq(refunds.id, id),
    with: withPaymentAndBooking,
  });
  return row ?? null;
}

export async function sumCompletedForPayment(paymentId) {
  const [row] = await db
    .select({ total: sum(refunds.amount) })
    .from(refunds)
    .where(and(eq(refunds.paymentId, paymentId), eq(refunds.status, 'completed')));
  // Prisma's _sum returns null when nothing matched; keep the 0 the caller expects.
  return row?.total ?? 0;
}

/**
 * `bookingId` and `customerId` filter on the payment's booking, which Prisma
 * expressed as a nested relation filter. Drizzle's relational API cannot filter
 * a parent by its relation, so those narrow to a set of payment ids first.
 */
async function paymentIdsFor({ bookingId, customerId }) {
  if (!bookingId && !customerId) return null;
  const filters = [
    bookingId ? eq(payments.bookingId, bookingId) : null,
    customerId ? eq(bookings.customerId, customerId) : null,
  ].filter(Boolean);

  const rows = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(and(...filters));
  return rows.map((r) => r.id);
}

export async function list({ limit, skip, status, paymentId, bookingId, customerId, dateFrom, dateTo }) {
  const scopedPaymentIds = await paymentIdsFor({ bookingId, customerId });
  // A relation filter that matched nothing must return nothing, not everything.
  if (scopedPaymentIds && scopedPaymentIds.length === 0) return { items: [], total: 0 };

  const filters = [
    status ? eq(refunds.status, status) : null,
    paymentId ? eq(refunds.paymentId, paymentId) : null,
    scopedPaymentIds ? inArray(refunds.paymentId, scopedPaymentIds) : null,
    dateFrom ? gte(refunds.createdAt, new Date(dateFrom)) : null,
    dateTo ? lte(refunds.createdAt, new Date(dateTo)) : null,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.refunds.findMany({
      where,
      with: withPaymentAndBooking,
      orderBy: desc(refunds.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(refunds).where(where),
  ]);

  return { items, total };
}
