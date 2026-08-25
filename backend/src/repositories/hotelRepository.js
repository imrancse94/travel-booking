import { prisma } from '../config/prisma.js';

const detailInclude = {
  images: { orderBy: { sortOrder: 'asc' } },
  hotelAmenities: { include: { amenity: true } },
  roomTypes: {
    where: { deletedAt: null },
    include: { images: { orderBy: { sortOrder: 'asc' } }, amenities: { include: { amenity: true } } },
  },
};

const listInclude = {
  images: { orderBy: { sortOrder: 'asc' }, take: 1 },
  _count: { select: { roomTypes: true } },
};

export async function findById(id) {
  return prisma.hotel.findFirst({ where: { id, deletedAt: null }, include: detailInclude });
}

export async function list({ page, limit, skip, search, city, country, starRating, status }) {
  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
    ...(country ? { country: { contains: country, mode: 'insensitive' } } : {}),
    ...(starRating ? { starRating: Number(starRating) } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { country: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.hotel.findMany({ where, include: listInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.hotel.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.hotel.create({ data, include: detailInclude });
}

export async function update(id, data) {
  return prisma.hotel.update({ where: { id }, data, include: detailInclude });
}

export async function softDelete(id) {
  return prisma.hotel.update({ where: { id }, data: { deletedAt: new Date(), status: 'inactive' } });
}

export async function addImage(hotelId, data) {
  return prisma.hotelImage.create({ data: { hotelId, ...data } });
}

export async function findImage(hotelId, imageId) {
  return prisma.hotelImage.findFirst({ where: { id: imageId, hotelId } });
}

export async function removeImage(imageId) {
  return prisma.hotelImage.delete({ where: { id: imageId } });
}

export async function findHotelAmenity(hotelId, amenityId) {
  return prisma.hotelAmenity.findUnique({ where: { hotelId_amenityId: { hotelId, amenityId } } });
}

export async function addAmenity(hotelId, amenityId) {
  return prisma.hotelAmenity.create({ data: { hotelId, amenityId }, include: { amenity: true } });
}

export async function removeAmenity(hotelId, amenityId) {
  return prisma.hotelAmenity.delete({ where: { hotelId_amenityId: { hotelId, amenityId } } });
}

export async function setAmenities(hotelId, amenityIds) {
  return prisma.$transaction([
    prisma.hotelAmenity.deleteMany({ where: { hotelId } }),
    prisma.hotelAmenity.createMany({
      data: amenityIds.map((amenityId) => ({ hotelId, amenityId })),
      skipDuplicates: true,
    }),
  ]);
}
