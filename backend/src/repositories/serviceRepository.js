import { prisma } from '../config/prisma.js';

export async function findById(id) {
  return prisma.service.findUnique({ where: { id } });
}

export async function list({ page, limit, skip, search, status }) {
  const where = {
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.service.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
    prisma.service.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.service.create({ data });
}

export async function update(id, data) {
  return prisma.service.update({ where: { id }, data });
}

export async function remove(id) {
  return prisma.service.delete({ where: { id } });
}

export async function countBookingUsage(id) {
  return prisma.bookingService.count({ where: { serviceId: id } });
}
