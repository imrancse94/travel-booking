import { and, count, desc, eq, gte, ilike, inArray, lte, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings, customers } from '../db/schema.js';

const fullRelations = {
  hotel: { columns: { id: true, name: true, city: true, country: true } },
  customer: { columns: { id: true, userId: true, firstName: true, lastName: true, email: true, phone: true } },
  agent: { columns: { id: true, firstName: true, lastName: true, email: true } },
  bookingRooms: { with: { room: true, roomType: true } },
  guests: true,
  services: { with: { service: true } },
  payments: true,
  invoices: true,
  statusHistory: true,
};

/** Prisma ordered the nested status history; Drizzle takes it as a callback. */
function withOrderedHistory() {
  return {
    ...fullRelations,
    statusHistory: { orderBy: (h, { desc: d }) => [d(h.createdAt)] },
  };
}

export async function findBookingById(id) {
  const row = await db.query.bookings.findFirst({ where: eq(bookings.id, id), with: withOrderedHistory() });
  return row ?? null;
}

/** The booking row on its own. For callers that only read its own columns. */
export async function findBookingRawById(id) {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return row ?? null;
}

/**
 * The booking plus the customer fields the payment and refund flows notify on.
 * Deliberately narrower than findBookingById, which pulls nine relations.
 */
export async function findBookingWithCustomer(id) {
  const row = await db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    with: { customer: { columns: { id: true, userId: true, firstName: true, lastName: true, email: true } } },
  });
  return row ?? null;
}

export async function findBookingByNumber(bookingNumber) {
  const row = await db.query.bookings.findFirst({
    where: eq(bookings.bookingNumber, bookingNumber),
    with: withOrderedHistory(),
  });
  return row ?? null;
}

/** The search also matches the customer's name or email, which lives on the relation. */
async function customerIdsMatching(search) {
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      or(
        ilike(customers.firstName, `%${search}%`),
        ilike(customers.lastName, `%${search}%`),
        ilike(customers.email, `%${search}%`)
      )
    );
  return rows.map((r) => r.id);
}

export async function listBookings({ page, limit, skip, search, status, hotelId, customerId, agentId, dateFrom, dateTo }) {
  const matchedCustomerIds = search ? await customerIdsMatching(search) : null;

  const filters = [
    status ? eq(bookings.status, status) : null,
    hotelId ? eq(bookings.hotelId, hotelId) : null,
    customerId ? eq(bookings.customerId, customerId) : null,
    agentId ? eq(bookings.agentId, agentId) : null,
    dateFrom ? gte(bookings.checkIn, new Date(dateFrom)) : null,
    dateTo ? lte(bookings.checkIn, new Date(dateTo)) : null,
    search
      ? or(
          ilike(bookings.bookingNumber, `%${search}%`),
          ...(matchedCustomerIds?.length ? [inArray(bookings.customerId, matchedCustomerIds)] : [])
        )
      : null,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.bookings.findMany({
      where,
      // The list view only needs enough for a table row.
      with: {
        hotel: { columns: { id: true, name: true } },
        customer: { columns: { id: true, firstName: true, lastName: true, email: true } },
        bookingRooms: { columns: { id: true }, with: { roomType: { columns: { name: true } } } },
      },
      orderBy: desc(bookings.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(bookings).where(where),
  ]);

  return { items, total, page, limit };
}

export async function listBookingsForCustomer(customerId, { page, limit, skip, status }) {
  return listBookings({ page, limit, skip, status, customerId });
}
