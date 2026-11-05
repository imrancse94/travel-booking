import { and, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { hotelAmenities, hotelImages, hotels, roomTypes } from '../db/schema.js';

const detailRelations = {
  images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
  hotelAmenities: { with: { amenity: true } },
  roomTypes: {
    where: (rt, { isNull: nul }) => nul(rt.deletedAt),
    with: {
      images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
      amenities: { with: { amenity: true } },
    },
  },
};

const notDeleted = isNull(hotels.deletedAt);

export async function findById(id) {
  const row = await db.query.hotels.findFirst({
    where: and(eq(hotels.id, id), notDeleted),
    with: detailRelations,
  });
  return row ?? null;
}

export async function list({ limit, skip, search, city, country, starRating, status }) {
  const filters = [
    notDeleted,
    status ? eq(hotels.status, status) : null,
    city ? ilike(hotels.city, `%${city}%`) : null,
    country ? ilike(hotels.country, `%${country}%`) : null,
    starRating ? eq(hotels.starRating, Number(starRating)) : null,
    search
      ? or(
          ilike(hotels.name, `%${search}%`),
          ilike(hotels.city, `%${search}%`),
          ilike(hotels.country, `%${search}%`)
        )
      : null,
  ].filter(Boolean);
  const where = and(...filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.query.hotels.findMany({
      where,
      with: { images: { orderBy: (i, { asc }) => [asc(i.sortOrder)], limit: 1 } },
      orderBy: desc(hotels.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(hotels).where(where),
  ]);

  // Prisma supplied `_count: { roomTypes }` alongside the row; Drizzle has no
  // equivalent in a relational query, so the counts are fetched in one grouped
  // pass rather than N queries.
  const withCounts = await attachRoomTypeCounts(items);
  return { items: withCounts, total };
}

async function attachRoomTypeCounts(items) {
  if (items.length === 0) return items;
  const rows = await db
    .select({ hotelId: roomTypes.hotelId, value: count() })
    .from(roomTypes)
    .where(isNull(roomTypes.deletedAt))
    .groupBy(roomTypes.hotelId);
  const byHotel = new Map(rows.map((r) => [r.hotelId, Number(r.value)]));
  return items.map((h) => ({ ...h, _count: { roomTypes: byHotel.get(h.id) ?? 0 } }));
}

export async function create(data) {
  const [created] = await db.insert(hotels).values(data).returning();
  return findById(created.id);
}

export async function update(id, data) {
  const [updated] = await db.update(hotels).set(data).where(eq(hotels.id, id)).returning();
  return updated ? findById(updated.id) : null;
}

export async function softDelete(id) {
  const [row] = await db
    .update(hotels)
    .set({ deletedAt: new Date(), status: 'inactive' })
    .where(eq(hotels.id, id))
    .returning();
  return row ?? null;
}

export async function addImage(hotelId, data) {
  const [row] = await db.insert(hotelImages).values({ hotelId, ...data }).returning();
  return row;
}

export async function findImage(hotelId, imageId) {
  const [row] = await db
    .select()
    .from(hotelImages)
    .where(and(eq(hotelImages.id, imageId), eq(hotelImages.hotelId, hotelId)))
    .limit(1);
  return row ?? null;
}

export async function removeImage(imageId) {
  const [row] = await db.delete(hotelImages).where(eq(hotelImages.id, imageId)).returning();
  return row ?? null;
}

// The composite primary key Prisma addressed as hotelId_amenityId.
const amenityKey = (hotelId, amenityId) =>
  and(eq(hotelAmenities.hotelId, hotelId), eq(hotelAmenities.amenityId, amenityId));

export async function findHotelAmenity(hotelId, amenityId) {
  const [row] = await db.select().from(hotelAmenities).where(amenityKey(hotelId, amenityId)).limit(1);
  return row ?? null;
}

export async function addAmenity(hotelId, amenityId) {
  const [row] = await db.insert(hotelAmenities).values({ hotelId, amenityId }).returning();
  return row;
}

export async function removeAmenity(hotelId, amenityId) {
  const [row] = await db.delete(hotelAmenities).where(amenityKey(hotelId, amenityId)).returning();
  return row ?? null;
}

export async function setAmenities(hotelId, amenityIds) {
  return db.transaction(async (tx) => {
    await tx.delete(hotelAmenities).where(eq(hotelAmenities.hotelId, hotelId));
    if (amenityIds.length === 0) return [];
    return tx
      .insert(hotelAmenities)
      .values(amenityIds.map((amenityId) => ({ hotelId, amenityId })))
      .onConflictDoNothing()
      .returning();
  });
}
