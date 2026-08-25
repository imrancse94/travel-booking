import { prisma } from '../config/prisma.js';

const detailInclude = {
  roomType: {
    select: {
      id: true,
      name: true,
      hotelId: true,
      hotel: { select: { id: true, name: true } },
    },
  },
};

export async function findById(id) {
  return prisma.room.findFirst({ where: { id, deletedAt: null }, include: detailInclude });
}

// Lighter lookup for existence / status checks, without the full include tree.
export async function findByIdRaw(id) {
  return prisma.room.findFirst({ where: { id, deletedAt: null } });
}

export async function list({ page, limit, skip, search, hotelId, roomTypeId, status }) {
  const where = {
    deletedAt: null,
    ...(roomTypeId ? { roomTypeId } : {}),
    ...(status ? { status } : {}),
    ...(hotelId ? { roomType: { hotelId } } : {}),
    ...(search ? { roomNumber: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.room.findMany({ where, include: detailInclude, orderBy: { roomNumber: 'asc' }, skip, take: limit }),
    prisma.room.count({ where }),
  ]);

  return { items, total };
}

export async function create(data) {
  return prisma.room.create({ data, include: detailInclude });
}

export async function update(id, data) {
  return prisma.room.update({ where: { id }, data, include: detailInclude });
}

export async function softDelete(id) {
  return prisma.room.update({ where: { id }, data: { deletedAt: new Date(), status: 'inactive' } });
}

// Booking rooms for this room whose stay has not fully ended yet and whose booking
// is in one of the supplied blocking statuses (see availabilityService.BLOCKING_BOOKING_STATUSES).
export async function findActiveBlockingBookings(roomId, blockingStatuses) {
  return prisma.bookingRoom.findMany({
    where: {
      roomId,
      checkOut: { gt: new Date() },
      booking: { status: { in: blockingStatuses } },
    },
    select: { id: true, bookingId: true, checkIn: true, checkOut: true },
  });
}
