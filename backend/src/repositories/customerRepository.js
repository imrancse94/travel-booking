import { prisma } from '../config/prisma.js';

export async function findById(id) {
  return prisma.customer.findFirst({ where: { id, deletedAt: null }, include: { documents: true } });
}

export async function findByEmail(email) {
  return prisma.customer.findUnique({ where: { email } });
}

export async function findByUserId(userId) {
  return prisma.customer.findFirst({ where: { userId, deletedAt: null }, include: { documents: true } });
}

export async function list({ page, limit, skip, search, nationality }) {
  const where = {
    deletedAt: null,
    ...(nationality ? { nationality } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { passportNumber: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.customer.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.customer.create({ data, include: { documents: true } });
}

export async function update(id, data) {
  return prisma.customer.update({ where: { id }, data, include: { documents: true } });
}

export async function softDelete(id) {
  return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function addDocument(customerId, { type, fileUrl }) {
  return prisma.customerDocument.create({ data: { customerId, type, fileUrl } });
}

export async function listDocuments(customerId) {
  return prisma.customerDocument.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } });
}

export async function findDocument(customerId, documentId) {
  return prisma.customerDocument.findFirst({ where: { id: documentId, customerId } });
}

export async function removeDocument(documentId) {
  return prisma.customerDocument.delete({ where: { id: documentId } });
}

export async function listBookingsForCustomer(customerId, { page, limit, skip, status }) {
  const where = { customerId, ...(status ? { status } : {}) };

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        hotel: { select: { id: true, name: true, city: true, country: true } },
        bookingRooms: { select: { id: true, roomType: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return { items, total };
}

export async function listPaymentsForCustomer(customerId, { page, limit, skip, status }) {
  const where = { booking: { customerId }, ...(status ? { status } : {}) };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { booking: { select: { id: true, bookingNumber: true, currency: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, total };
}
