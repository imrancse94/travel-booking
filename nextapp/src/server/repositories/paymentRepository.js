import { and, count, desc, eq, gte, inArray, lte, ilike, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings, payments } from '../db/schema.js';

const withBookingAndRefunds = {
  booking: { columns: { id: true, bookingNumber: true, currency: true, totalAmount: true, customerId: true } },
  refunds: true,
};

export async function findById(id) {
  const row = await db.query.payments.findFirst({
    where: eq(payments.id, id),
    with: withBookingAndRefunds,
  });
  return row ?? null;
}

/** The payment plus the booking and customer that refundPayment updates and notifies. */
export async function findByIdWithBookingCustomer(id) {
  const row = await db.query.payments.findFirst({
    where: eq(payments.id, id),
    with: {
      booking: {
        with: { customer: { columns: { id: true, userId: true, firstName: true, lastName: true, email: true } } },
      },
    },
  });
  return row ?? null;
}

/**
 * `customerId` and the booking-number search reach through the booking
 * relation, which Prisma could express inline. Drizzle's relational API cannot
 * filter a parent by its relation, so those narrow to a set of booking ids
 * first and the main query filters on that.
 */
async function bookingIdsFor({ customerId, search }) {
  if (!customerId && !search) return null;
  const filters = [
    customerId ? eq(bookings.customerId, customerId) : null,
    search ? ilike(bookings.bookingNumber, `%${search}%`) : null,
  ].filter(Boolean);
  const rows = await db.select({ id: bookings.id }).from(bookings).where(and(...filters));
  return rows.map((r) => r.id);
}

export async function list({ limit, skip, search, bookingId, customerId, status, method, dateFrom, dateTo }) {
  // A search matches either the payment's own transaction id or its booking
  // number, so the booking-id set widens the match rather than narrowing it.
  const searchBookingIds = await bookingIdsFor({ search });
  const customerBookingIds = customerId ? await bookingIdsFor({ customerId }) : null;
  if (customerBookingIds && customerBookingIds.length === 0) return { items: [], total: 0 };

  const searchClause = search
    ? or(
        ilike(payments.transactionId, `%${search}%`),
        ...(searchBookingIds?.length ? [inArray(payments.bookingId, searchBookingIds)] : [])
      )
    : null;

  const filters = [
    bookingId ? eq(payments.bookingId, bookingId) : null,
    customerBookingIds ? inArray(payments.bookingId, customerBookingIds) : null,
    status ? eq(payments.status, status) : null,
    method ? eq(payments.method, method) : null,
    dateFrom ? gte(payments.createdAt, new Date(dateFrom)) : null,
    dateTo ? lte(payments.createdAt, new Date(dateTo)) : null,
    searchClause,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.payments.findMany({
      where,
      with: withBookingAndRefunds,
      orderBy: desc(payments.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(payments).where(where),
  ]);

  return { items, total };
}

export async function create(data) {
  const [row] = await db.insert(payments).values(data).returning();
  return row;
}
