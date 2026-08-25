import { prisma } from '../config/prisma.js';

const fullInclude = {
  agent: { select: { id: true, firstName: true, lastName: true, email: true } },
  booking: { select: { id: true, bookingNumber: true, totalAmount: true, currency: true } },
};

export async function findById(id) {
  return prisma.commission.findUnique({ where: { id }, include: fullInclude });
}

export async function list({ page, limit, skip, agentId, status, bookingId, dateFrom, dateTo }) {
  const where = {
    ...(agentId ? { agentId } : {}),
    ...(status ? { status } : {}),
    ...(bookingId ? { bookingId } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.commission.findMany({ where, include: fullInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.commission.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.commission.create({ data, include: fullInclude });
}

export async function updateStatus(id, data) {
  return prisma.commission.update({ where: { id }, data, include: fullInclude });
}
