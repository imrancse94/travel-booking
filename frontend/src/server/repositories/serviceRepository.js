import { and, asc, count, eq, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookingServices, services } from '../db/schema.js';

export async function findById(id) {
  const [row] = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return row ?? null;
}

export async function list({ limit, skip, search, status }) {
  const filters = [
    status ? eq(services.status, status) : null,
    search ? ilike(services.name, `%${search}%`) : null,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.select().from(services).where(where).orderBy(asc(services.name)).limit(limit).offset(skip),
    db.select({ value: count() }).from(services).where(where),
  ]);

  return { items, total };
}

export async function create(data) {
  const [row] = await db.insert(services).values(data).returning();
  return row;
}

export async function update(id, data) {
  const [row] = await db.update(services).set(data).where(eq(services.id, id)).returning();
  return row ?? null;
}

export async function remove(id) {
  const [row] = await db.delete(services).where(eq(services.id, id)).returning();
  return row ?? null;
}

export async function countBookingUsage(id) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(bookingServices)
    .where(eq(bookingServices.serviceId, id));
  return value;
}
