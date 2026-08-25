import { prisma } from '../config/prisma.js';

const detailInclude = {
  destination: { select: { id: true, name: true, country: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  itineraries: { orderBy: { dayNumber: 'asc' } },
};

export async function findById(id) {
  return prisma.tourPackage.findFirst({ where: { id, deletedAt: null }, include: detailInclude });
}

export async function findRawById(id) {
  return prisma.tourPackage.findFirst({ where: { id, deletedAt: null } });
}

export async function list({ page, limit, skip, search, destinationId, status }) {
  const where = {
    deletedAt: null,
    ...(destinationId ? { destinationId } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.tourPackage.findMany({
      where,
      include: { destination: { select: { id: true, name: true, country: true } }, images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.tourPackage.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.tourPackage.create({ data, include: detailInclude });
}

export async function update(id, data) {
  return prisma.tourPackage.update({ where: { id }, data, include: detailInclude });
}

export async function softDelete(id) {
  return prisma.tourPackage.update({ where: { id }, data: { deletedAt: new Date(), status: 'inactive' } });
}

// ---- Itinerary ----

export async function findItineraryDay(tourPackageId, dayNumber) {
  return prisma.tourItinerary.findUnique({ where: { tourPackageId_dayNumber: { tourPackageId, dayNumber } } });
}

export async function listItinerary(tourPackageId) {
  return prisma.tourItinerary.findMany({ where: { tourPackageId }, orderBy: { dayNumber: 'asc' } });
}

export async function createItineraryDay(tourPackageId, data) {
  return prisma.tourItinerary.create({ data: { ...data, tourPackageId } });
}

export async function updateItineraryDay(tourPackageId, dayNumber, data) {
  return prisma.tourItinerary.update({ where: { tourPackageId_dayNumber: { tourPackageId, dayNumber } }, data });
}

export async function deleteItineraryDay(tourPackageId, dayNumber) {
  return prisma.tourItinerary.delete({ where: { tourPackageId_dayNumber: { tourPackageId, dayNumber } } });
}

// ---- Images ----

export async function listImages(tourPackageId) {
  return prisma.tourImage.findMany({ where: { tourPackageId }, orderBy: { sortOrder: 'asc' } });
}

export async function findImageById(imageId) {
  return prisma.tourImage.findUnique({ where: { id: imageId } });
}

export async function createImage(tourPackageId, data) {
  return prisma.tourImage.create({ data: { ...data, tourPackageId } });
}

export async function updateImage(imageId, data) {
  return prisma.tourImage.update({ where: { id: imageId }, data });
}

export async function deleteImage(imageId) {
  return prisma.tourImage.delete({ where: { id: imageId } });
}
