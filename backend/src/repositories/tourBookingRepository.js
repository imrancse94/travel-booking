import { prisma } from '../config/prisma.js';

const fullInclude = {
  tourPackage: { select: { id: true, name: true, durationDays: true, price: true, currency: true, destination: { select: { id: true, name: true } } } },
  customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, userId: true } },
};

export async function findById(id) {
  return prisma.tourBooking.findUnique({ where: { id }, include: fullInclude });
}

export async function findByNumber(bookingNumber) {
  return prisma.tourBooking.findUnique({ where: { bookingNumber }, include: fullInclude });
}

export async function list({ page, limit, skip, search, status, customerId, tourPackageId, dateFrom, dateTo }) {
  const where = {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(tourPackageId ? { tourPackageId } : {}),
    ...(dateFrom || dateTo
      ? {
          travelDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { bookingNumber: { contains: search, mode: 'insensitive' } },
            { customer: { firstName: { contains: search, mode: 'insensitive' } } },
            { customer: { lastName: { contains: search, mode: 'insensitive' } } },
            { customer: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.tourBooking.findMany({ where, include: fullInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.tourBooking.count({ where }),
  ]);

  return { items, total };
}
