import { prisma } from '../config/prisma.js';

const fullInclude = {
  hotel: { select: { id: true, name: true, city: true, country: true } },
  customer: { select: { id: true, userId: true, firstName: true, lastName: true, email: true, phone: true } },
  agent: { select: { id: true, firstName: true, lastName: true, email: true } },
  bookingRooms: { include: { room: true, roomType: true } },
  guests: true,
  services: { include: { service: true } },
  payments: true,
  invoices: true,
  statusHistory: { orderBy: { createdAt: 'desc' } },
};

export async function findBookingById(id) {
  return prisma.booking.findUnique({ where: { id }, include: fullInclude });
}

export async function findBookingByNumber(bookingNumber) {
  return prisma.booking.findUnique({ where: { bookingNumber }, include: fullInclude });
}

export async function listBookings({ page, limit, skip, search, status, hotelId, customerId, agentId, dateFrom, dateTo }) {
  const where = {
    ...(status ? { status } : {}),
    ...(hotelId ? { hotelId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(agentId ? { agentId } : {}),
    ...(dateFrom || dateTo
      ? {
          checkIn: {
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
    prisma.booking.findMany({
      where,
      include: {
        hotel: { select: { id: true, name: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        bookingRooms: { select: { id: true, roomType: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function listBookingsForCustomer(customerId, { page, limit, skip, status }) {
  return listBookings({ page, limit, skip, status, customerId });
}
