import { prisma } from '../config/prisma.js';

const fullInclude = {
  payment: { include: { booking: { select: { id: true, bookingNumber: true, currency: true, customerId: true } } } },
};

export async function findById(id) {
  return prisma.refund.findUnique({ where: { id }, include: fullInclude });
}

export async function sumCompletedForPayment(paymentId) {
  const result = await prisma.refund.aggregate({
    where: { paymentId, status: 'completed' },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function list({ page, limit, skip, status, paymentId, bookingId, customerId, dateFrom, dateTo }) {
  const where = {
    ...(status ? { status } : {}),
    ...(paymentId ? { paymentId } : {}),
    ...(bookingId ? { payment: { bookingId } } : {}),
    ...(customerId ? { payment: { booking: { customerId } } } : {}),
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
    prisma.refund.findMany({ where, include: fullInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.refund.count({ where }),
  ]);

  return { items, total };
}
