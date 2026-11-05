import { and, asc, eq, gt, gte, ilike, inArray, isNull, lt, ne, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookingRooms, bookings, hotelAmenities, hotels, rooms } from '../db/schema.js';
import { calculateRoomStayPrice } from './pricingService.js';

// Booking statuses that actually occupy a room. `pending` bookings have not
// reserved anything yet, and `checked_out`/`cancelled`/`no_show` release the room.
export const BLOCKING_BOOKING_STATUSES = ['held', 'confirmed', 'checked_in'];

/**
 * Returns the set of room IDs (from `roomIds`) that have at least one
 * overlapping booking in a blocking status for [checkIn, checkOut).
 *
 * Overlap rule: existing.check_in < requested.check_out AND existing.check_out > requested.check_in
 *
 * `client` is the transaction when this runs inside the booking lock, so the
 * read sees the same snapshot the insert will be made against. The booking's
 * status was a nested Prisma filter and is now a join.
 */
export async function findOverlappingRoomIds(client, { roomIds, checkIn, checkOut, excludeBookingId }) {
  if (roomIds.length === 0) return new Set();
  const conn = client || db;

  const filters = [
    inArray(bookingRooms.roomId, roomIds),
    lt(bookingRooms.checkIn, new Date(checkOut)),
    gt(bookingRooms.checkOut, new Date(checkIn)),
    excludeBookingId ? ne(bookingRooms.bookingId, excludeBookingId) : null,
    inArray(bookings.status, BLOCKING_BOOKING_STATUSES),
  ].filter(Boolean);

  const overlapping = await conn
    .select({ roomId: bookingRooms.roomId })
    .from(bookingRooms)
    .innerJoin(bookings, eq(bookingRooms.bookingId, bookings.id))
    .where(and(...filters));

  return new Set(overlapping.map((r) => r.roomId));
}

export async function getAvailableRoomsForType({ client, roomTypeId, checkIn, checkOut, limit }) {
  const conn = client || db;

  const roomRows = await conn
    .select()
    .from(rooms)
    .where(
      and(
        eq(rooms.roomTypeId, roomTypeId),
        inArray(rooms.status, ['available', 'occupied']),
        isNull(rooms.deletedAt)
      )
    )
    .orderBy(asc(rooms.roomNumber));

  const roomIds = roomRows.map((r) => r.id);
  const overlapping = await findOverlappingRoomIds(conn, { roomIds, checkIn, checkOut });
  const available = roomRows.filter(
    (r) => !overlapping.has(r.id) && r.status !== 'maintenance' && r.status !== 'inactive'
  );

  return typeof limit === 'number' ? available.slice(0, limit) : available;
}

/** Hotel ids carrying at least one of the requested amenities. */
async function hotelIdsWithAnyAmenity(amenityIds) {
  const rows = await db
    .selectDistinct({ hotelId: hotelAmenities.hotelId })
    .from(hotelAmenities)
    .where(inArray(hotelAmenities.amenityId, amenityIds));
  return rows.map((r) => r.hotelId);
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
  // Prisma expressed this as `hotelAmenities: { some: ... }`; Drizzle cannot
  // filter a parent by its relation, so the ids are resolved first.
  const amenityHotelIds = amenityIds?.length ? await hotelIdsWithAnyAmenity(amenityIds) : null;
  if (amenityHotelIds && amenityHotelIds.length === 0) return [];

  const filters = [
    eq(hotels.status, 'active'),
    isNull(hotels.deletedAt),
    hotelId ? eq(hotels.id, hotelId) : null,
    starRating ? gte(hotels.starRating, Number(starRating)) : null,
    amenityHotelIds ? inArray(hotels.id, amenityHotelIds) : null,
    destination
      ? or(
          ilike(hotels.city, `%${destination}%`),
          ilike(hotels.country, `%${destination}%`),
          ilike(hotels.name, `%${destination}%`)
        )
      : null,
  ].filter(Boolean);

  const hotelRows = await db.query.hotels.findMany({
    where: and(...filters),
    with: {
      images: { orderBy: (i, { asc: a }) => [a(i.sortOrder)] },
      hotelAmenities: { with: { amenity: true } },
      roomTypes: {
        where: (rt, { and: a, eq: e, gte: g, isNull: nul }) =>
          a(
            nul(rt.deletedAt),
            g(rt.maxAdults, adults),
            ...(roomTypeId ? [e(rt.id, roomTypeId)] : [])
          ),
        with: {
          amenities: { with: { amenity: true } },
          images: { orderBy: (i, { asc: a2 }) => [a2(i.sortOrder)] },
        },
      },
    },
  });

  const results = [];

  for (const hotel of hotelRows) {
    const roomTypeResults = [];

    for (const rt of hotel.roomTypes) {
      const available = await getAvailableRoomsForType({ roomTypeId: rt.id, checkIn, checkOut });
      if (available.length < roomsRequested) continue;

      // Best-effort: a room type with no rates configured for this period
      // still shows up as available, just without a price (search results
      // filter/sort by price treat it as unpriced rather than excluding it).
      let pricing = null;
      try {
        pricing = await calculateRoomStayPrice({ tx: db, roomTypeId: rt.id, checkIn, checkOut, adults, children });
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
