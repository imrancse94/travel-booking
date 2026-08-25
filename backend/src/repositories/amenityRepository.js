import { prisma } from '../config/prisma.js';

export async function findById(id) {
  return prisma.amenity.findUnique({ where: { id } });
}

export async function findByName(name) {
  return prisma.amenity.findUnique({ where: { name } });
}

export async function list({ page, limit, skip, search, category }) {
  const where = {
    ...(category ? { category } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.amenity.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
    prisma.amenity.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.amenity.create({ data });
}

export async function update(id, data) {
  return prisma.amenity.update({ where: { id }, data });
}

export async function remove(id) {
  return prisma.amenity.delete({ where: { id } });
}
