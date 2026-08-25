import * as hotelRepository from '../repositories/hotelRepository.js';
import * as amenityRepository from '../repositories/amenityRepository.js';
import { NotFoundError } from '../utils/errors.js';
import { recordAudit } from './auditService.js';

export async function listHotels(query) {
  return hotelRepository.list(query);
}

export async function getHotel(id) {
  const hotel = await hotelRepository.findById(id);
  if (!hotel) throw new NotFoundError('Hotel not found');
  return hotel;
}

export async function createHotel(data, actorId) {
  const hotel = await hotelRepository.create(data);
  await recordAudit({ userId: actorId, action: 'hotel.created', entity: 'Hotel', entityId: hotel.id, newValue: { name: hotel.name } });
  return hotel;
}

export async function updateHotel(id, data, actorId) {
  const existing = await hotelRepository.findById(id);
  if (!existing) throw new NotFoundError('Hotel not found');

  const updated = await hotelRepository.update(id, data);
  await recordAudit({ userId: actorId, action: 'hotel.updated', entity: 'Hotel', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function deleteHotel(id, actorId) {
  const existing = await hotelRepository.findById(id);
  if (!existing) throw new NotFoundError('Hotel not found');

  await hotelRepository.softDelete(id);
  await recordAudit({ userId: actorId, action: 'hotel.deleted', entity: 'Hotel', entityId: id });
}

export async function addHotelImage(hotelId, data, actorId) {
  const hotel = await hotelRepository.findById(hotelId);
  if (!hotel) throw new NotFoundError('Hotel not found');

  const image = await hotelRepository.addImage(hotelId, data);
  await recordAudit({
    userId: actorId,
    action: 'hotel.image_added',
    entity: 'Hotel',
    entityId: hotelId,
    newValue: { imageId: image.id, url: image.url },
  });
  return image;
}

export async function removeHotelImage(hotelId, imageId, actorId) {
  const image = await hotelRepository.findImage(hotelId, imageId);
  if (!image) throw new NotFoundError('Hotel image not found');

  await hotelRepository.removeImage(imageId);
  await recordAudit({ userId: actorId, action: 'hotel.image_removed', entity: 'Hotel', entityId: hotelId, oldValue: { imageId } });
}

export async function assignAmenity(hotelId, amenityId, actorId) {
  const hotel = await hotelRepository.findById(hotelId);
  if (!hotel) throw new NotFoundError('Hotel not found');
  const amenity = await amenityRepository.findById(amenityId);
  if (!amenity) throw new NotFoundError('Amenity not found');

  const existing = await hotelRepository.findHotelAmenity(hotelId, amenityId);
  if (existing) return existing;

  const link = await hotelRepository.addAmenity(hotelId, amenityId);
  await recordAudit({ userId: actorId, action: 'hotel.amenity_assigned', entity: 'Hotel', entityId: hotelId, newValue: { amenityId } });
  return link;
}

export async function unassignAmenity(hotelId, amenityId, actorId) {
  const existing = await hotelRepository.findHotelAmenity(hotelId, amenityId);
  if (!existing) throw new NotFoundError('Amenity is not assigned to this hotel');

  await hotelRepository.removeAmenity(hotelId, amenityId);
  await recordAudit({ userId: actorId, action: 'hotel.amenity_unassigned', entity: 'Hotel', entityId: hotelId, oldValue: { amenityId } });
}

// Bulk replace -- used by the admin hotel form, which lets an operator pick
// the full amenity set at once rather than assigning/unassigning one at a time.
export async function setAmenities(hotelId, amenityIds, actorId) {
  const hotel = await hotelRepository.findById(hotelId);
  if (!hotel) throw new NotFoundError('Hotel not found');

  await hotelRepository.setAmenities(hotelId, amenityIds);
  await recordAudit({ userId: actorId, action: 'hotel.amenities_set', entity: 'Hotel', entityId: hotelId, newValue: { amenityIds } });
  return getHotel(hotelId);
}
