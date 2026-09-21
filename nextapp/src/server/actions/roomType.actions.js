'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createRoomTypeSchema, updateRoomTypeSchema, setAmenitiesSchema, addRoomTypeImageSchema } from '../validators/roomType.validators.js';
import * as roomTypeService from '../services/roomTypeService.js';

/** Same collapse-two-calls-into-one as hotel.actions.js's saveHotelAction -- see its comment. */
export async function saveRoomTypeAction({ id, payload, amenityIds }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'room_types.update' : 'room_types.create');

    const roomType = id
      ? await roomTypeService.updateRoomType(id, parse('body', payload, updateRoomTypeSchema), user.id)
      : await roomTypeService.createRoomType(parse('body', payload, createRoomTypeSchema), user.id);

    if (amenityIds) {
      const { amenityIds: parsedIds } = parse('body', { amenityIds }, setAmenitiesSchema);
      await roomTypeService.setAmenities(roomType.id, parsedIds, user.id).catch(() => null);
    }

    return roomType;
  });
}

export async function deleteRoomTypeAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'room_types.delete');
    await roomTypeService.deleteRoomType(id, user.id);
    return null;
  });
}

export async function addRoomTypeImageAction(roomTypeId, payload) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'room_types.update');
    return roomTypeService.addImage(roomTypeId, parse('body', payload, addRoomTypeImageSchema), user.id);
  });
}

export async function removeRoomTypeImageAction(roomTypeId, imageId) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'room_types.update');
    await roomTypeService.removeImage(roomTypeId, imageId, user.id);
    return null;
  });
}
