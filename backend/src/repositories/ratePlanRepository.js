import { prisma } from '../config/prisma.js';

export async function findById(id) {
  return prisma.ratePlan.findUnique({ where: { id } });
}

export async function list({ page, limit, skip, search, type }) {
  const where = {
    ...(type ? { type } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.ratePlan.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.ratePlan.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.ratePlan.create({ data });
}

export async function update(id, data) {
  return prisma.ratePlan.update({ where: { id }, data });
}

export async function remove(id) {
  return prisma.ratePlan.delete({ where: { id } });
}

// -- Room rates (scoped to a room type / rate plan pair) --

export async function findRoomRateById(id) {
  return prisma.roomRate.findUnique({ where: { id }, include: { roomType: true, ratePlan: true } });
}

export async function listRoomRatesForRoomType(roomTypeId, { page, limit, skip } = {}) {
  const where = { roomTypeId };

  const [items, total] = await Promise.all([
    prisma.roomRate.findMany({
      where,
      include: { ratePlan: true },
      orderBy: [{ startDate: 'asc' }, { priority: 'desc' }],
      ...(skip !== undefined && limit !== undefined ? { skip, take: limit } : {}),
    }),
    prisma.roomRate.count({ where }),
  ]);

  return { items, total };
}

export async function createRoomRate(data) {
  return prisma.roomRate.create({ data, include: { ratePlan: true } });
}

export async function updateRoomRate(id, data) {
  return prisma.roomRate.update({ where: { id }, data, include: { ratePlan: true } });
}

export async function removeRoomRate(id) {
  return prisma.roomRate.delete({ where: { id } });
}
