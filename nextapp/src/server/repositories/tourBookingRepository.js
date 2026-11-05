import { and, count, desc, eq, gte, inArray, lte, ilike, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers, tourBookings } from '../db/schema.js';

const fullRelations = {
  tourPackage: {
    columns: { id: true, name: true, durationDays: true, price: true, currency: true },
    with: { destination: { columns: { id: true, name: true } } },
  },
  customer: { columns: { id: true, firstName: true, lastName: true, email: true, phone: true, userId: true } },
};

export async function findById(id) {
  const row = await db.query.tourBookings.findFirst({ where: eq(tourBookings.id, id), with: fullRelations });
  return row ?? null;
}

export async function findByNumber(bookingNumber) {
  const row = await db.query.tourBookings.findFirst({
    where: eq(tourBookings.bookingNumber, bookingNumber),
    with: fullRelations,
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

export async function list({ limit, skip, search, status, customerId, tourPackageId, dateFrom, dateTo }) {
  const matchedCustomerIds = search ? await customerIdsMatching(search) : null;

  const filters = [
    status ? eq(tourBookings.status, status) : null,
    customerId ? eq(tourBookings.customerId, customerId) : null,
    tourPackageId ? eq(tourBookings.tourPackageId, tourPackageId) : null,
    dateFrom ? gte(tourBookings.travelDate, new Date(dateFrom)) : null,
    dateTo ? lte(tourBookings.travelDate, new Date(dateTo)) : null,
    search
      ? or(
          ilike(tourBookings.bookingNumber, `%${search}%`),
          ...(matchedCustomerIds?.length ? [inArray(tourBookings.customerId, matchedCustomerIds)] : [])
        )
      : null,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.tourBookings.findMany({
      where,
      with: fullRelations,
      orderBy: desc(tourBookings.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(tourBookings).where(where),
  ]);

  return { items, total };
}
