import { and, asc, count, desc, eq, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { ratePlans, roomRates } from '../db/schema.js';

export async function findById(id) {
  const [row] = await db.select().from(ratePlans).where(eq(ratePlans.id, id)).limit(1);
  return row ?? null;
}

export async function list({ limit, skip, search, type }) {
  const filters = [
    type ? eq(ratePlans.type, type) : null,
    search ? ilike(ratePlans.name, `%${search}%`) : null,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.select().from(ratePlans).where(where).orderBy(desc(ratePlans.createdAt)).limit(limit).offset(skip),
    db.select({ value: count() }).from(ratePlans).where(where),
  ]);

  return { items, total };
}

export async function create(data) {
  const [row] = await db.insert(ratePlans).values(data).returning();
  return row;
}

export async function update(id, data) {
  const [row] = await db.update(ratePlans).set(data).where(eq(ratePlans.id, id)).returning();
  return row ?? null;
}

export async function remove(id) {
  const [row] = await db.delete(ratePlans).where(eq(ratePlans.id, id)).returning();
  return row ?? null;
}

// -- Room rates (scoped to a room type / rate plan pair) --

export async function findRoomRateById(id) {
  const row = await db.query.roomRates.findFirst({
    where: eq(roomRates.id, id),
    with: { roomType: true, ratePlan: true },
  });
  return row ?? null;
}

export async function listRoomRatesForRoomType(roomTypeId, { limit, skip } = {}) {
  return listRoomRates({ roomTypeId, limit, skip });
}

/** `roomTypeId` narrows to one room type; omitted, it lists across all of them. */
export async function listRoomRates({ roomTypeId, limit, skip } = {}) {
  const where = roomTypeId ? eq(roomRates.roomTypeId, roomTypeId) : undefined;
  // The caller omits paging when it wants every matching rate.
  const paging = skip !== undefined && limit !== undefined ? { limit, offset: skip } : {};

  const [items, [{ value: total }]] = await Promise.all([
    db.query.roomRates.findMany({
      where,
      with: { ratePlan: true, roomType: true },
      orderBy: [asc(roomRates.startDate), desc(roomRates.priority)],
      ...paging,
    }),
    db.select({ value: count() }).from(roomRates).where(where),
  ]);

  return { items, total };
}

export async function createRoomRate(data) {
  const [created] = await db.insert(roomRates).values(data).returning();
  return findRoomRateById(created.id);
}

export async function updateRoomRate(id, data) {
  const [updated] = await db.update(roomRates).set(data).where(eq(roomRates.id, id)).returning();
  return updated ? findRoomRateById(updated.id) : null;
}

export async function removeRoomRate(id) {
  const [row] = await db.delete(roomRates).where(eq(roomRates.id, id)).returning();
  return row ?? null;
}
