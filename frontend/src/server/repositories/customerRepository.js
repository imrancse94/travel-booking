import { and, count, desc, eq, ilike, isNull, inArray, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings, customerDocuments, customers, payments } from '../db/schema.js';

const notDeleted = isNull(customers.deletedAt);

export async function findById(id) {
  const row = await db.query.customers.findFirst({
    where: and(eq(customers.id, id), notDeleted),
    with: { documents: true },
  });
  return row ?? null;
}

export async function findByEmail(email) {
  const [row] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  return row ?? null;
}

export async function findByUserId(userId) {
  const row = await db.query.customers.findFirst({
    where: and(eq(customers.userId, userId), notDeleted),
    with: { documents: true },
  });
  return row ?? null;
}

export async function list({ limit, skip, search, nationality }) {
  const filters = [
    notDeleted,
    nationality ? eq(customers.nationality, nationality) : null,
    search
      ? or(
          ilike(customers.firstName, `%${search}%`),
          ilike(customers.lastName, `%${search}%`),
          ilike(customers.email, `%${search}%`),
          ilike(customers.phone, `%${search}%`),
          ilike(customers.passportNumber, `%${search}%`)
        )
      : null,
  ].filter(Boolean);
  const where = and(...filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(limit).offset(skip),
    db.select({ value: count() }).from(customers).where(where),
  ]);

  return { items, total };
}

export async function create(data) {
  const [created] = await db.insert(customers).values(data).returning();
  return findById(created.id);
}

export async function update(id, data) {
  const [updated] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
  return updated ? findById(updated.id) : null;
}

export async function softDelete(id) {
  const [row] = await db
    .update(customers)
    .set({ deletedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  return row ?? null;
}

export async function addDocument(customerId, { type, fileUrl }) {
  const [row] = await db.insert(customerDocuments).values({ customerId, type, fileUrl }).returning();
  return row;
}

export async function listDocuments(customerId) {
  return db
    .select()
    .from(customerDocuments)
    .where(eq(customerDocuments.customerId, customerId))
    .orderBy(desc(customerDocuments.createdAt));
}

export async function findDocument(customerId, documentId) {
  const [row] = await db
    .select()
    .from(customerDocuments)
    .where(and(eq(customerDocuments.id, documentId), eq(customerDocuments.customerId, customerId)))
    .limit(1);
  return row ?? null;
}

export async function removeDocument(documentId) {
  const [row] = await db.delete(customerDocuments).where(eq(customerDocuments.id, documentId)).returning();
  return row ?? null;
}

export async function listBookingsForCustomer(customerId, { limit, skip, status }) {
  const filters = [eq(bookings.customerId, customerId), status ? eq(bookings.status, status) : null].filter(Boolean);
  const where = and(...filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.query.bookings.findMany({
      where,
      with: {
        hotel: { columns: { id: true, name: true, city: true, country: true } },
        bookingRooms: { columns: { id: true }, with: { roomType: { columns: { name: true } } } },
      },
      orderBy: desc(bookings.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(bookings).where(where),
  ]);

  return { items, total };
}

export async function listPaymentsForCustomer(customerId, { limit, skip, status }) {
  // Prisma filtered on `booking: { customerId }`; Drizzle cannot filter a
  // parent by its relation, so the customer's bookings are resolved first.
  const bookingRows = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.customerId, customerId));
  const bookingIds = bookingRows.map((b) => b.id);
  if (bookingIds.length === 0) return { items: [], total: 0 };

  const filters = [inArray(payments.bookingId, bookingIds), status ? eq(payments.status, status) : null].filter(Boolean);
  const where = and(...filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.query.payments.findMany({
      where,
      with: { booking: { columns: { id: true, bookingNumber: true, currency: true } } },
      orderBy: desc(payments.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(payments).where(where),
  ]);

  return { items, total };
}
