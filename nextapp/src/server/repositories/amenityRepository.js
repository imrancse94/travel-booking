import { and, asc, count, eq, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { amenities } from '../db/schema.js';

/**
 * Drizzle equivalents of the Prisma calls this file used to make. Two
 * differences the callers must not notice:
 *   - Prisma's findUnique resolved to null when nothing matched; a Drizzle
 *     select resolves to an empty array, so each lookup normalises to null.
 *   - insert/update/delete need .returning() to hand the row back the way
 *     Prisma's create/update/delete did.
 */
async function findOne(where) {
  const [row] = await db.select().from(amenities).where(where).limit(1);
  return row ?? null;
}

export async function findById(id) {
  return findOne(eq(amenities.id, id));
}

export async function findByName(name) {
  return findOne(eq(amenities.name, name));
}

export async function list({ limit, skip, search, category }) {
  const filters = [
    category ? eq(amenities.category, category) : null,
    // Prisma's { contains, mode: 'insensitive' }.
    search ? ilike(amenities.name, `%${search}%`) : null,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.select().from(amenities).where(where).orderBy(asc(amenities.name)).limit(limit).offset(skip),
    db.select({ value: count() }).from(amenities).where(where),
  ]);

  return { items, total };
}

export async function create(data) {
  const [row] = await db.insert(amenities).values(data).returning();
  return row;
}

export async function update(id, data) {
  const [row] = await db.update(amenities).set(data).where(eq(amenities.id, id)).returning();
  return row ?? null;
}

export async function remove(id) {
  const [row] = await db.delete(amenities).where(eq(amenities.id, id)).returning();
  return row ?? null;
}
