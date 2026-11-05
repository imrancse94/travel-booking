'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createHotelSchema, updateHotelSchema, setAmenitiesSchema, addHotelImageSchema } from '../validators/hotel.validators.js';
import * as hotelService from '../services/hotelService.js';

/**
 * Collapses what the client used to do as two HTTP calls -- create/update
 * the hotel, then PUT its amenities, with the second call's failure silently
 * swallowed (`.catch(() => null)` in HotelForm.jsx) -- into one action that
 * does both server-side. Same effective behavior (amenities failing doesn't
 * fail the save), one round trip instead of two.
 */
export async function saveHotelAction({ id, payload, amenityIds }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'hotels.update' : 'hotels.create');

    const hotel = id
      ? await hotelService.updateHotel(id, parse('body', payload, updateHotelSchema), user.id)
      : await hotelService.createHotel(parse('body', payload, createHotelSchema), user.id);

    if (amenityIds) {
      const { amenityIds: parsedIds } = parse('body', { amenityIds }, setAmenitiesSchema);
      await hotelService.setAmenities(hotel.id, parsedIds, user.id).catch(() => null);
    }

    return hotel;
  });
}

export async function deleteHotelAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'hotels.delete');
    await hotelService.deleteHotel(id, user.id);
    return null;
  });
}

export async function addHotelImageAction(hotelId, payload) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'hotels.update');
    return hotelService.addHotelImage(hotelId, parse('body', payload, addHotelImageSchema), user.id);
  });
}

export async function removeHotelImageAction(hotelId, imageId) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'hotels.update');
    await hotelService.removeHotelImage(hotelId, imageId, user.id);
    return null;
  });
}
