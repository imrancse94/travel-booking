import { prisma } from '../config/prisma.js';
import { calculateRoomStayPrice } from './pricingService.js';

// Booking statuses that actually occupy a room. `pending` bookings have not
// reserved anything yet, and `checked_out`/`cancelled`/`no_show` release the room.
export const BLOCKING_BOOKING_STATUSES = ['held', 'confirmed', 'checked_in'];

/**
 * Returns the set of room IDs (from `roomIds`) that have at least one
 * overlapping booking in a blocking status for [checkIn, checkOut).
 *
 * Overlap rule: existing.check_in < requested.check_out AND existing.check_out > requested.check_in
 */
export async function findOverlappingRoomIds(client, { roomIds, checkIn, checkOut, excludeBookingId }) {
  if (roomIds.length === 0) return new Set();
  const db = client || prisma;
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  const overlapping = await db.bookingRoom.findMany({
    where: {
      roomId: { in: roomIds },
      checkIn: { lt: checkOutDate },
      checkOut: { gt: checkInDate },
      ...(excludeBookingId ? { bookingId: { not: excludeBookingId } } : {}),
      booking: { status: { in: BLOCKING_BOOKING_STATUSES } },
    },
    select: { roomId: true },
  });

  return new Set(overlapping.map((r) => r.roomId));
}

export async function getAvailableRoomsForType({ client, roomTypeId, checkIn, checkOut, limit }) {
  const db = client || prisma;

  const rooms = await db.room.findMany({
    where: { roomTypeId, status: { in: ['available', 'occupied'] }, deletedAt: null },
    orderBy: { roomNumber: 'asc' },
  });

  const roomIds = rooms.map((r) => r.id);
  const overlapping = await findOverlappingRoomIds(db, { roomIds, checkIn, checkOut });
  const available = rooms.filter((r) => !overlapping.has(r.id) && r.status !== 'maintenance' && r.status !== 'inactive');

  return typeof limit === 'number' ? available.slice(0, limit) : available;
}

/**
 * Search hotels/room types with availability for the given filters. Used by
 * the customer-facing hotel search (section 12) and by the booking form to
 * verify room type availability before quoting a price.
 */
export async function searchAvailability({
  destination,
  hotelId,
  checkIn,
  checkOut,
  adults = 1,
  children = 0,
  roomsRequested = 1,
  roomTypeId,
  starRating,
  amenityIds,
}) {
  const hotelWhere = {
    status: 'active',
    deletedAt: null,
    ...(hotelId ? { id: hotelId } : {}),
    ...(starRating ? { starRating: { gte: Number(starRating) } } : {}),
    ...(destination
      ? {
          OR: [
            { city: { contains: destination, mode: 'insensitive' } },
            { country: { contains: destination, mode: 'insensitive' } },
            { name: { contains: destination, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(amenityIds?.length ? { hotelAmenities: { some: { amenityId: { in: amenityIds } } } } : {}),
  };

  const hotels = await prisma.hotel.findMany({
    where: hotelWhere,
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      hotelAmenities: { include: { amenity: true } },
      roomTypes: {
        where: {
          deletedAt: null,
          maxAdults: { gte: Math.min(adults, roomsRequested > 0 ? adults : adults) },
          ...(roomTypeId ? { id: roomTypeId } : {}),
        },
        include: { amenities: { include: { amenity: true } }, images: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  const results = [];

  for (const hotel of hotels) {
    const roomTypeResults = [];

    for (const rt of hotel.roomTypes) {
      const available = await getAvailableRoomsForType({ roomTypeId: rt.id, checkIn, checkOut });
      if (available.length < roomsRequested) continue;

      // Best-effort: a room type with no rates configured for this period
      // still shows up as available, just without a price (search results
      // filter/sort by price treat it as unpriced rather than excluding it).
      let pricing = null;
      try {
        pricing = await calculateRoomStayPrice({ tx: prisma, roomTypeId: rt.id, checkIn, checkOut, adults, children });
      } catch {
        pricing = null;
      }

      roomTypeResults.push({
        id: rt.id,
        name: rt.name,
        description: rt.description,
        maxAdults: rt.maxAdults,
        maxChildren: rt.maxChildren,
        bedType: rt.bedType,
        images: rt.images,
        amenities: rt.amenities.map((a) => a.amenity),
        availableRooms: available.length,
        nights: pricing?.nights ?? null,
        ratePerNight: pricing?.ratePerNight ?? null,
        totalPrice: pricing?.totalPrice ?? null,
        currency: pricing?.currency ?? null,
      });
    }

    if (roomTypeResults.length === 0) continue;

    results.push({
      id: hotel.id,
      name: hotel.name,
      description: hotel.description,
      city: hotel.city,
      country: hotel.country,
      starRating: hotel.starRating,
      images: hotel.images,
      amenities: hotel.hotelAmenities.map((a) => a.amenity),
      cancellationPolicy: hotel.cancellationPolicy,
      roomTypes: roomTypeResults,
    });
  }

  return results;
}
