import { and, asc, count, eq, gt, ilike, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookingRooms, bookings, rooms, roomTypes } from '../db/schema.js';

const withRoomTypeAndHotel = {
  roomType: {
    columns: { id: true, name: true, hotelId: true },
    with: { hotel: { columns: { id: true, name: true } } },
  },
};

const notDeleted = isNull(rooms.deletedAt);

export async function findById(id) {
  const row = await db.query.rooms.findFirst({
    where: and(eq(rooms.id, id), notDeleted),
    with: withRoomTypeAndHotel,
  });
  return row ?? null;
}

// Lighter lookup for existence / status checks, without the relation tree.
export async function findByIdRaw(id) {
  const [row] = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.id, id), notDeleted))
    .limit(1);
  return row ?? null;
}

/** `hotelId` filters on the room's type, which Prisma expressed as a nested where. */
async function roomTypeIdsForHotel(hotelId) {
  const rows = await db.select({ id: roomTypes.id }).from(roomTypes).where(eq(roomTypes.hotelId, hotelId));
  return rows.map((r) => r.id);
}

export async function list({ limit, skip, search, hotelId, roomTypeId, status }) {
  const hotelRoomTypeIds = hotelId ? await roomTypeIdsForHotel(hotelId) : null;
  if (hotelRoomTypeIds && hotelRoomTypeIds.length === 0) return { items: [], total: 0 };

  const filters = [
    notDeleted,
    roomTypeId ? eq(rooms.roomTypeId, roomTypeId) : null,
    status ? eq(rooms.status, status) : null,
    hotelRoomTypeIds ? inArray(rooms.roomTypeId, hotelRoomTypeIds) : null,
    search ? ilike(rooms.roomNumber, `%${search}%`) : null,
  ].filter(Boolean);
  const where = and(...filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.query.rooms.findMany({
      where,
      with: withRoomTypeAndHotel,
      orderBy: asc(rooms.roomNumber),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(rooms).where(where),
  ]);

  return { items, total };
}

export async function create(data) {
  const [created] = await db.insert(rooms).values(data).returning();
  return findById(created.id);
}

export async function update(id, data) {
  const [updated] = await db.update(rooms).set(data).where(eq(rooms.id, id)).returning();
  return updated ? findById(updated.id) : null;
}

export async function softDelete(id) {
  const [row] = await db
    .update(rooms)
    .set({ deletedAt: new Date(), status: 'inactive' })
    .where(eq(rooms.id, id))
    .returning();
  return row ?? null;
}

/**
 * Booking rooms for this room whose stay has not fully ended and whose booking
 * is in one of the blocking statuses (availabilityService.BLOCKING_BOOKING_STATUSES).
 * The booking-status condition is a join rather than a nested where.
 */
export async function findActiveBlockingBookings(roomId, blockingStatuses) {
  return db
    .select({
      id: bookingRooms.id,
      bookingId: bookingRooms.bookingId,
      checkIn: bookingRooms.checkIn,
      checkOut: bookingRooms.checkOut,
    })
    .from(bookingRooms)
    .innerJoin(bookings, eq(bookingRooms.bookingId, bookings.id))
    .where(
      and(
        eq(bookingRooms.roomId, roomId),
        gt(bookingRooms.checkOut, new Date()),
        inArray(bookings.status, blockingStatuses)
      )
    );
}
