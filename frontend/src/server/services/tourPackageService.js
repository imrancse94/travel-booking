import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import * as tourPackageRepository from '../repositories/tourPackageRepository.js';
import { recordAudit } from './auditService.js';

export async function listTourPackages(query) {
  const { items, total } = await tourPackageRepository.list(query);
  return { items, total };
}

export async function getTourPackage(id) {
  const tourPackage = await tourPackageRepository.findById(id);
  if (!tourPackage) throw new NotFoundError('Tour package not found');
  return tourPackage;
}

export async function createTourPackage(data, actorId) {
  const tourPackage = await tourPackageRepository.create(data);
  await recordAudit({ userId: actorId, action: 'tour_package.created', entity: 'TourPackage', entityId: tourPackage.id, newValue: data });
  return tourPackage;
}

export async function updateTourPackage(id, data, actorId) {
  const existing = await tourPackageRepository.findRawById(id);
  if (!existing) throw new NotFoundError('Tour package not found');

  const updated = await tourPackageRepository.update(id, data);
  await recordAudit({ userId: actorId, action: 'tour_package.updated', entity: 'TourPackage', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function deleteTourPackage(id, actorId) {
  const existing = await tourPackageRepository.findRawById(id);
  if (!existing) throw new NotFoundError('Tour package not found');

  await tourPackageRepository.softDelete(id);
  await recordAudit({ userId: actorId, action: 'tour_package.deleted', entity: 'TourPackage', entityId: id });
}

// ---- Itinerary ----

export async function listItinerary(tourPackageId) {
  const tourPackage = await tourPackageRepository.findRawById(tourPackageId);
  if (!tourPackage) throw new NotFoundError('Tour package not found');
  return tourPackageRepository.listItinerary(tourPackageId);
}

export async function addItineraryDay(tourPackageId, data, actorId) {
  const tourPackage = await tourPackageRepository.findRawById(tourPackageId);
  if (!tourPackage) throw new NotFoundError('Tour package not found');

  const existingDay = await tourPackageRepository.findItineraryDay(tourPackageId, data.dayNumber);
  if (existingDay) throw new ConflictError(`Itinerary day ${data.dayNumber} already exists for this tour package`);
  if (data.dayNumber > tourPackage.durationDays) {
    throw new ValidationError(`Day ${data.dayNumber} exceeds the tour duration of ${tourPackage.durationDays} days`);
  }

  const day = await tourPackageRepository.createItineraryDay(tourPackageId, data);
  await recordAudit({ userId: actorId, action: 'tour_itinerary.created', entity: 'TourItinerary', entityId: day.id, newValue: data });
  return day;
}

export async function updateItineraryDay(tourPackageId, dayNumber, data, actorId) {
  const existing = await tourPackageRepository.findItineraryDay(tourPackageId, dayNumber);
  if (!existing) throw new NotFoundError(`Itinerary day ${dayNumber} not found`);

  const updated = await tourPackageRepository.updateItineraryDay(tourPackageId, dayNumber, data);
  await recordAudit({ userId: actorId, action: 'tour_itinerary.updated', entity: 'TourItinerary', entityId: existing.id, oldValue: existing, newValue: data });
  return updated;
}

export async function removeItineraryDay(tourPackageId, dayNumber, actorId) {
  const existing = await tourPackageRepository.findItineraryDay(tourPackageId, dayNumber);
  if (!existing) throw new NotFoundError(`Itinerary day ${dayNumber} not found`);

  await tourPackageRepository.deleteItineraryDay(tourPackageId, dayNumber);
  await recordAudit({ userId: actorId, action: 'tour_itinerary.deleted', entity: 'TourItinerary', entityId: existing.id });
}

// ---- Images ----

export async function listImages(tourPackageId) {
  const tourPackage = await tourPackageRepository.findRawById(tourPackageId);
  if (!tourPackage) throw new NotFoundError('Tour package not found');
  return tourPackageRepository.listImages(tourPackageId);
}

export async function addImage(tourPackageId, data, actorId) {
  const tourPackage = await tourPackageRepository.findRawById(tourPackageId);
  if (!tourPackage) throw new NotFoundError('Tour package not found');

  const image = await tourPackageRepository.createImage(tourPackageId, data);
  await recordAudit({ userId: actorId, action: 'tour_image.created', entity: 'TourImage', entityId: image.id, newValue: data });
  return image;
}

export async function updateImage(tourPackageId, imageId, data, actorId) {
  const existing = await tourPackageRepository.findImageById(imageId);
  if (!existing || existing.tourPackageId !== tourPackageId) throw new NotFoundError('Tour image not found');

  const updated = await tourPackageRepository.updateImage(imageId, data);
  await recordAudit({ userId: actorId, action: 'tour_image.updated', entity: 'TourImage', entityId: imageId, oldValue: existing, newValue: data });
  return updated;
}

export async function removeImage(tourPackageId, imageId, actorId) {
  const existing = await tourPackageRepository.findImageById(imageId);
  if (!existing || existing.tourPackageId !== tourPackageId) throw new NotFoundError('Tour image not found');

  await tourPackageRepository.deleteImage(imageId);
  await recordAudit({ userId: actorId, action: 'tour_image.deleted', entity: 'TourImage', entityId: imageId });
}
