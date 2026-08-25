import { prisma } from '../config/prisma.js';

export async function findById(id) {
  return prisma.destination.findFirst({ where: { id, deletedAt: null } });
}

export async function findByIdWithTours(id) {
  return prisma.destination.findFirst({
    where: { id, deletedAt: null },
    include: { tourPackages: { where: { deletedAt: null }, select: { id: true, name: true, price: true, currency: true, status: true } } },
  });
}

export async function list({ page, limit, skip, search, country, status }) {
  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(country ? { country: { equals: country, mode: 'insensitive' } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { country: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.destination.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.destination.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.destination.create({ data });
}

export async function update(id, data) {
  return prisma.destination.update({ where: { id }, data });
}

export async function softDelete(id) {
  return prisma.destination.update({ where: { id }, data: { deletedAt: new Date(), status: 'inactive' } });
}
