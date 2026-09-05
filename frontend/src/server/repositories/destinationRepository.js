import { and, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { destinations } from '../db/schema.js';

// Every read filters out soft-deleted rows, which Prisma expressed as
// `deletedAt: null`.
const notDeleted = isNull(destinations.deletedAt);

export async function findById(id) {
  const [row] = await db
    .select()
    .from(destinations)
    .where(and(eq(destinations.id, id), notDeleted))
    .limit(1);
  return row ?? null;
}

export async function findByIdWithTours(id) {
  const row = await db.query.destinations.findFirst({
    where: and(eq(destinations.id, id), notDeleted),
    with: {
      tourPackages: {
        columns: { id: true, name: true, price: true, currency: true, status: true },
      },
    },
  });
  if (!row) return null;
  // Prisma filtered the nested tours by deletedAt; Drizzle's `with` has no
  // per-relation soft-delete filter here, so it is applied after the fetch.
  return { ...row, tourPackages: (row.tourPackages || []).filter((t) => t.deletedAt == null) };
}

export async function list({ limit, skip, search, country, status }) {
  const filters = [
    notDeleted,
    status ? eq(destinations.status, status) : null,
    // Prisma's { equals, mode: 'insensitive' } -- an exact match, case-blind.
    country ? ilike(destinations.country, country) : null,
    search
      ? or(
          ilike(destinations.name, `%${search}%`),
          ilike(destinations.country, `%${search}%`),
          ilike(destinations.description, `%${search}%`)
        )
      : null,
  ].filter(Boolean);
  const where = and(...filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.select().from(destinations).where(where).orderBy(desc(destinations.createdAt)).limit(limit).offset(skip),
    db.select({ value: count() }).from(destinations).where(where),
  ]);

  return { items, total };
}

export async function create(data) {
  const [row] = await db.insert(destinations).values(data).returning();
  return row;
}

export async function update(id, data) {
  const [row] = await db.update(destinations).set(data).where(eq(destinations.id, id)).returning();
  return row ?? null;
}

export async function softDelete(id) {
  const [row] = await db
    .update(destinations)
    .set({ deletedAt: new Date(), status: 'inactive' })
    .where(eq(destinations.id, id))
    .returning();
  return row ?? null;
}
