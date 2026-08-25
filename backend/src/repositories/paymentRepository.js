import { prisma } from '../config/prisma.js';

const fullInclude = {
  booking: { select: { id: true, bookingNumber: true, currency: true, totalAmount: true, customerId: true } },
  refunds: true,
};

export async function findById(id) {
  return prisma.payment.findUnique({ where: { id }, include: fullInclude });
}

export async function list({ page, limit, skip, search, bookingId, customerId, status, method, dateFrom, dateTo }) {
  const where = {
    ...(bookingId ? { bookingId } : {}),
    ...(customerId ? { booking: { customerId } } : {}),
    ...(status ? { status } : {}),
    ...(method ? { method } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { transactionId: { contains: search, mode: 'insensitive' } },
            { booking: { bookingNumber: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: fullInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.payment.create({ data });
}
