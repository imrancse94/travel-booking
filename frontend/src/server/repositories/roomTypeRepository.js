import { and, count, desc, eq, ilike, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { roomTypeAmenities, roomTypeImages, roomTypes } from '../db/schema.js';

const detailRelations = {
  hotel: { columns: { id: true, name: true, city: true, country: true } },
  images: { orderBy: (i, { asc }) => [asc(i.sortOrder)] },
  amenities: { with: { amenity: true } },
};

const notDeleted = isNull(roomTypes.deletedAt);

export async function findById(id) {
  const row = await db.query.roomTypes.findFirst({
    where: and(eq(roomTypes.id, id), notDeleted),
    with: detailRelations,
  });
  return row ?? null;
}

// Lighter lookup for existence checks / FK validation, without the relation tree.
export async function findByIdRaw(id) {
  const [row] = await db
    .select()
    .from(roomTypes)
    .where(and(eq(roomTypes.id, id), notDeleted))
    .limit(1);
  return row ?? null;
}

export async function list({ limit, skip, search, hotelId }) {
  const filters = [
    notDeleted,
    hotelId ? eq(roomTypes.hotelId, hotelId) : null,
    search ? ilike(roomTypes.name, `%${search}%`) : null,
  ].filter(Boolean);
  const where = and(...filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.query.roomTypes.findMany({
      where,
      with: detailRelations,
      orderBy: desc(roomTypes.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(roomTypes).where(where),
  ]);

  return { items, total };
}

export async function create(data) {
  const [created] = await db.insert(roomTypes).values(data).returning();
  return findById(created.id);
}

export async function update(id, data) {
  const [updated] = await db.update(roomTypes).set(data).where(eq(roomTypes.id, id)).returning();
  return updated ? findById(updated.id) : null;
}

export async function softDelete(id) {
  const [row] = await db
    .update(roomTypes)
    .set({ deletedAt: new Date() })
    .where(eq(roomTypes.id, id))
    .returning();
  return row ?? null;
}

export async function addImage(roomTypeId, data) {
  const [row] = await db.insert(roomTypeImages).values({ roomTypeId, ...data }).returning();
  return row;
}

export async function findImage(roomTypeId, imageId) {
  const [row] = await db
    .select()
    .from(roomTypeImages)
    .where(and(eq(roomTypeImages.id, imageId), eq(roomTypeImages.roomTypeId, roomTypeId)))
    .limit(1);
  return row ?? null;
}

export async function removeImage(imageId) {
  const [row] = await db.delete(roomTypeImages).where(eq(roomTypeImages.id, imageId)).returning();
  return row ?? null;
}

// The composite primary key Prisma addressed as roomTypeId_amenityId.
const amenityKey = (roomTypeId, amenityId) =>
  and(eq(roomTypeAmenities.roomTypeId, roomTypeId), eq(roomTypeAmenities.amenityId, amenityId));

export async function findRoomTypeAmenity(roomTypeId, amenityId) {
  const [row] = await db.select().from(roomTypeAmenities).where(amenityKey(roomTypeId, amenityId)).limit(1);
  return row ?? null;
}

export async function addAmenity(roomTypeId, amenityId) {
  const [row] = await db.insert(roomTypeAmenities).values({ roomTypeId, amenityId }).returning();
  return row;
}

export async function removeAmenity(roomTypeId, amenityId) {
  const [row] = await db.delete(roomTypeAmenities).where(amenityKey(roomTypeId, amenityId)).returning();
  return row ?? null;
}

export async function setAmenities(roomTypeId, amenityIds) {
  return db.transaction(async (tx) => {
    await tx.delete(roomTypeAmenities).where(eq(roomTypeAmenities.roomTypeId, roomTypeId));
    if (amenityIds.length === 0) return [];
    // Prisma's skipDuplicates; the pair is the primary key.
    return tx
      .insert(roomTypeAmenities)
      .values(amenityIds.map((amenityId) => ({ roomTypeId, amenityId })))
      .onConflictDoNothing()
      .returning();
  });
}
