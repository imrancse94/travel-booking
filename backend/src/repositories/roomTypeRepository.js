import { prisma } from '../config/prisma.js';

const detailInclude = {
  hotel: { select: { id: true, name: true, city: true, country: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  amenities: { include: { amenity: true } },
};

export async function findById(id) {
  return prisma.roomType.findFirst({ where: { id, deletedAt: null }, include: detailInclude });
}

// Lighter lookup for existence checks / FK validation from other services, without the full include tree.
export async function findByIdRaw(id) {
  return prisma.roomType.findFirst({ where: { id, deletedAt: null } });
}

export async function list({ page, limit, skip, search, hotelId }) {
  const where = {
    deletedAt: null,
    ...(hotelId ? { hotelId } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.roomType.findMany({ where, include: detailInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.roomType.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.roomType.create({ data, include: detailInclude });
}

export async function update(id, data) {
  return prisma.roomType.update({ where: { id }, data, include: detailInclude });
}

export async function softDelete(id) {
  return prisma.roomType.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function addImage(roomTypeId, data) {
  return prisma.roomTypeImage.create({ data: { roomTypeId, ...data } });
}

export async function findImage(roomTypeId, imageId) {
  return prisma.roomTypeImage.findFirst({ where: { id: imageId, roomTypeId } });
}

export async function removeImage(imageId) {
  return prisma.roomTypeImage.delete({ where: { id: imageId } });
}

export async function findRoomTypeAmenity(roomTypeId, amenityId) {
  return prisma.roomTypeAmenity.findUnique({ where: { roomTypeId_amenityId: { roomTypeId, amenityId } } });
}

export async function addAmenity(roomTypeId, amenityId) {
  return prisma.roomTypeAmenity.create({ data: { roomTypeId, amenityId }, include: { amenity: true } });
}

export async function removeAmenity(roomTypeId, amenityId) {
  return prisma.roomTypeAmenity.delete({ where: { roomTypeId_amenityId: { roomTypeId, amenityId } } });
}

export async function setAmenities(roomTypeId, amenityIds) {
  return prisma.$transaction([
    prisma.roomTypeAmenity.deleteMany({ where: { roomTypeId } }),
    prisma.roomTypeAmenity.createMany({
      data: amenityIds.map((amenityId) => ({ roomTypeId, amenityId })),
      skipDuplicates: true,
    }),
  ]);
}
