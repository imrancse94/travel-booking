import { and, asc, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tourImages, tourItineraries, tourPackages } from '../db/schema.js';

const detailRelations = {
  destination: { columns: { id: true, name: true, country: true } },
  images: { orderBy: (i, { asc: a }) => [a(i.sortOrder)] },
  itineraries: { orderBy: (i, { asc: a }) => [a(i.dayNumber)] },
};

const notDeleted = isNull(tourPackages.deletedAt);

export async function findById(id) {
  const row = await db.query.tourPackages.findFirst({
    where: and(eq(tourPackages.id, id), notDeleted),
    with: detailRelations,
  });
  return row ?? null;
}

export async function findRawById(id) {
  const [row] = await db
    .select()
    .from(tourPackages)
    .where(and(eq(tourPackages.id, id), notDeleted))
    .limit(1);
  return row ?? null;
}

export async function list({ limit, skip, search, destinationId, status }) {
  const filters = [
    notDeleted,
    destinationId ? eq(tourPackages.destinationId, destinationId) : null,
    status ? eq(tourPackages.status, status) : null,
    search
      ? or(ilike(tourPackages.name, `%${search}%`), ilike(tourPackages.description, `%${search}%`))
      : null,
  ].filter(Boolean);
  const where = and(...filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.query.tourPackages.findMany({
      where,
      with: {
        destination: { columns: { id: true, name: true, country: true } },
        images: { orderBy: (i, { asc: a }) => [a(i.sortOrder)], limit: 1 },
      },
      orderBy: desc(tourPackages.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(tourPackages).where(where),
  ]);

  return { items, total };
}

export async function create(data) {
  const [created] = await db.insert(tourPackages).values(data).returning();
  return findById(created.id);
}

export async function update(id, data) {
  const [updated] = await db.update(tourPackages).set(data).where(eq(tourPackages.id, id)).returning();
  return updated ? findById(updated.id) : null;
}

export async function softDelete(id) {
  const [row] = await db
    .update(tourPackages)
    .set({ deletedAt: new Date(), status: 'inactive' })
    .where(eq(tourPackages.id, id))
    .returning();
  return row ?? null;
}

// ---- Itinerary ----
// Prisma addressed this composite key as tourPackageId_dayNumber.
const dayKey = (tourPackageId, dayNumber) =>
  and(eq(tourItineraries.tourPackageId, tourPackageId), eq(tourItineraries.dayNumber, dayNumber));

export async function findItineraryDay(tourPackageId, dayNumber) {
  const [row] = await db.select().from(tourItineraries).where(dayKey(tourPackageId, dayNumber)).limit(1);
  return row ?? null;
}

export async function listItinerary(tourPackageId) {
  return db
    .select()
    .from(tourItineraries)
    .where(eq(tourItineraries.tourPackageId, tourPackageId))
    .orderBy(asc(tourItineraries.dayNumber));
}

export async function createItineraryDay(tourPackageId, data) {
  const [row] = await db.insert(tourItineraries).values({ ...data, tourPackageId }).returning();
  return row;
}

export async function updateItineraryDay(tourPackageId, dayNumber, data) {
  const [row] = await db.update(tourItineraries).set(data).where(dayKey(tourPackageId, dayNumber)).returning();
  return row ?? null;
}

export async function deleteItineraryDay(tourPackageId, dayNumber) {
  const [row] = await db.delete(tourItineraries).where(dayKey(tourPackageId, dayNumber)).returning();
  return row ?? null;
}

// ---- Images ----

export async function listImages(tourPackageId) {
  return db
    .select()
    .from(tourImages)
    .where(eq(tourImages.tourPackageId, tourPackageId))
    .orderBy(asc(tourImages.sortOrder));
}

export async function findImageById(imageId) {
  const [row] = await db.select().from(tourImages).where(eq(tourImages.id, imageId)).limit(1);
  return row ?? null;
}

export async function createImage(tourPackageId, data) {
  const [row] = await db.insert(tourImages).values({ ...data, tourPackageId }).returning();
  return row;
}

export async function updateImage(imageId, data) {
  const [row] = await db.update(tourImages).set(data).where(eq(tourImages.id, imageId)).returning();
  return row ?? null;
}

export async function deleteImage(imageId) {
  const [row] = await db.delete(tourImages).where(eq(tourImages.id, imageId)).returning();
  return row ?? null;
}
