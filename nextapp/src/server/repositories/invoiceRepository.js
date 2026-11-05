import { and, count, desc, eq, gte, ilike, inArray, lte, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings, invoices } from '../db/schema.js';

// The full tree the invoice PDF and detail view need.
const fullRelations = {
  items: true,
  booking: {
    with: {
      hotel: true,
      customer: true,
      bookingRooms: { with: { roomType: true } },
      services: { with: { service: true } },
    },
  },
};

export async function findById(id) {
  const row = await db.query.invoices.findFirst({ where: eq(invoices.id, id), with: fullRelations });
  return row ?? null;
}

export async function findByBookingId(bookingId) {
  const row = await db.query.invoices.findFirst({
    where: eq(invoices.bookingId, bookingId),
    with: fullRelations,
    orderBy: desc(invoices.createdAt),
  });
  return row ?? null;
}

async function bookingIdsFor({ customerId, search }) {
  const filters = [
    customerId ? eq(bookings.customerId, customerId) : null,
    search ? ilike(bookings.bookingNumber, `%${search}%`) : null,
  ].filter(Boolean);
  if (!filters.length) return null;
  const rows = await db.select({ id: bookings.id }).from(bookings).where(and(...filters));
  return rows.map((r) => r.id);
}

export async function list({ limit, skip, search, status, bookingId, customerId, dateFrom, dateTo }) {
  const customerBookingIds = customerId ? await bookingIdsFor({ customerId }) : null;
  if (customerBookingIds && customerBookingIds.length === 0) return { items: [], total: 0 };
  const searchBookingIds = search ? await bookingIdsFor({ search }) : null;

  const filters = [
    status ? eq(invoices.status, status) : null,
    bookingId ? eq(invoices.bookingId, bookingId) : null,
    customerBookingIds ? inArray(invoices.bookingId, customerBookingIds) : null,
    dateFrom ? gte(invoices.issuedAt, new Date(dateFrom)) : null,
    dateTo ? lte(invoices.issuedAt, new Date(dateTo)) : null,
    search
      ? or(
          ilike(invoices.invoiceNumber, `%${search}%`),
          ...(searchBookingIds?.length ? [inArray(invoices.bookingId, searchBookingIds)] : [])
        )
      : null,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.invoices.findMany({
      where,
      // The list only needs enough to render a row.
      with: {
        booking: {
          columns: { id: true, bookingNumber: true },
          with: { customer: { columns: { firstName: true, lastName: true } } },
        },
      },
      orderBy: desc(invoices.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(invoices).where(where),
  ]);

  return { items, total };
}

export async function updatePdfUrl(id, pdfUrl) {
  const [row] = await db.update(invoices).set({ pdfUrl }).where(eq(invoices.id, id)).returning();
  return row ?? null;
}
