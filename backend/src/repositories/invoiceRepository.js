import { prisma } from '../config/prisma.js';

const fullInclude = {
  items: true,
  booking: {
    include: {
      hotel: true,
      customer: true,
      bookingRooms: { include: { roomType: true } },
      services: { include: { service: true } },
    },
  },
};

export async function findById(id) {
  return prisma.invoice.findUnique({ where: { id }, include: fullInclude });
}

export async function findByBookingId(bookingId) {
  return prisma.invoice.findFirst({ where: { bookingId }, include: fullInclude, orderBy: { createdAt: 'desc' } });
}

export async function list({ page, limit, skip, search, status, bookingId, customerId, dateFrom, dateTo }) {
  const where = {
    ...(status ? { status } : {}),
    ...(bookingId ? { bookingId } : {}),
    ...(customerId ? { booking: { customerId } } : {}),
    ...(dateFrom || dateTo
      ? {
          issuedAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { booking: { bookingNumber: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { booking: { select: { id: true, bookingNumber: true, customer: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, total };
}

export async function updatePdfUrl(id, pdfUrl) {
  return prisma.invoice.update({ where: { id }, data: { pdfUrl } });
}
