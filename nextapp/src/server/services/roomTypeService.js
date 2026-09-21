import * as roomTypeRepository from '../repositories/roomTypeRepository.js';
import * as hotelRepository from '../repositories/hotelRepository.js';
import * as amenityRepository from '../repositories/amenityRepository.js';
import { NotFoundError } from '../utils/errors.js';
import { recordAudit } from './auditService.js';

export async function listRoomTypes(query) {
  return roomTypeRepository.list(query);
}

export async function getRoomType(id) {
  const roomType = await roomTypeRepository.findById(id);
  if (!roomType) throw new NotFoundError('Room type not found');
  return roomType;
}

export async function createRoomType(data, actorId) {
  const hotel = await hotelRepository.findById(data.hotelId);
  if (!hotel) throw new NotFoundError('Hotel not found');

  const roomType = await roomTypeRepository.create(data);
  await recordAudit({
    userId: actorId,
    action: 'room_type.created',
    entity: 'RoomType',
    entityId: roomType.id,
    newValue: { name: roomType.name, hotelId: data.hotelId },
  });
  return roomType;
}

export async function updateRoomType(id, data, actorId) {
  const existing = await roomTypeRepository.findById(id);
  if (!existing) throw new NotFoundError('Room type not found');

  const updated = await roomTypeRepository.update(id, data);
  await recordAudit({ userId: actorId, action: 'room_type.updated', entity: 'RoomType', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function deleteRoomType(id, actorId) {
  const existing = await roomTypeRepository.findById(id);
  if (!existing) throw new NotFoundError('Room type not found');

  await roomTypeRepository.softDelete(id);
  await recordAudit({ userId: actorId, action: 'room_type.deleted', entity: 'RoomType', entityId: id });
}

export async function addImage(roomTypeId, data, actorId) {
  const roomType = await roomTypeRepository.findById(roomTypeId);
  if (!roomType) throw new NotFoundError('Room type not found');

  const image = await roomTypeRepository.addImage(roomTypeId, data);
  await recordAudit({
    userId: actorId,
    action: 'room_type.image_added',
    entity: 'RoomType',
    entityId: roomTypeId,
    newValue: { imageId: image.id, url: image.url },
  });
  return image;
}

export async function removeImage(roomTypeId, imageId, actorId) {
  const image = await roomTypeRepository.findImage(roomTypeId, imageId);
  if (!image) throw new NotFoundError('Room type image not found');

  await roomTypeRepository.removeImage(imageId);
  await recordAudit({
    userId: actorId,
    action: 'room_type.image_removed',
    entity: 'RoomType',
    entityId: roomTypeId,
    oldValue: { imageId },
  });
}

export async function assignAmenity(roomTypeId, amenityId, actorId) {
  const roomType = await roomTypeRepository.findById(roomTypeId);
  if (!roomType) throw new NotFoundError('Room type not found');
  const amenity = await amenityRepository.findById(amenityId);
  if (!amenity) throw new NotFoundError('Amenity not found');

  const existing = await roomTypeRepository.findRoomTypeAmenity(roomTypeId, amenityId);
  if (existing) return existing;

  const link = await roomTypeRepository.addAmenity(roomTypeId, amenityId);
  await recordAudit({
    userId: actorId,
    action: 'room_type.amenity_assigned',
    entity: 'RoomType',
    entityId: roomTypeId,
    newValue: { amenityId },
  });
  return link;
}

export async function unassignAmenity(roomTypeId, amenityId, actorId) {
  const existing = await roomTypeRepository.findRoomTypeAmenity(roomTypeId, amenityId);
  if (!existing) throw new NotFoundError('Amenity is not assigned to this room type');

  await roomTypeRepository.removeAmenity(roomTypeId, amenityId);
  await recordAudit({
    userId: actorId,
    action: 'room_type.amenity_unassigned',
    entity: 'RoomType',
    entityId: roomTypeId,
    oldValue: { amenityId },
  });
}

// Bulk replace -- used by the admin room type form, which lets an operator
// pick the full amenity set at once rather than assigning/unassigning one at a time.
export async function setAmenities(roomTypeId, amenityIds, actorId) {
  const roomType = await roomTypeRepository.findById(roomTypeId);
  if (!roomType) throw new NotFoundError('Room type not found');

  await roomTypeRepository.setAmenities(roomTypeId, amenityIds);
  await recordAudit({
    userId: actorId,
    action: 'room_type.amenities_set',
    entity: 'RoomType',
    entityId: roomTypeId,
    newValue: { amenityIds },
  });
  return getRoomType(roomTypeId);
}
