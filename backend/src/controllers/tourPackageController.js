import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as tourPackageService from '../services/tourPackageService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await tourPackageService.listTourPackages({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const tourPackage = await tourPackageService.getTourPackage(req.params.id);
  return success(res, { data: tourPackage });
});

export const create = asyncHandler(async (req, res) => {
  const tourPackage = await tourPackageService.createTourPackage(req.body, req.user.id);
  return created(res, tourPackage, 'Tour package created');
});

export const update = asyncHandler(async (req, res) => {
  const tourPackage = await tourPackageService.updateTourPackage(req.params.id, req.body, req.user.id);
  return success(res, { data: tourPackage, message: 'Tour package updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await tourPackageService.deleteTourPackage(req.params.id, req.user.id);
  return success(res, { message: 'Tour package deleted' });
});

// ---- Itinerary ----

export const listItinerary = asyncHandler(async (req, res) => {
  const itinerary = await tourPackageService.listItinerary(req.params.tourId);
  return success(res, { data: itinerary });
});

export const addItineraryDay = asyncHandler(async (req, res) => {
  const day = await tourPackageService.addItineraryDay(req.params.tourId, req.body, req.user.id);
  return created(res, day, 'Itinerary day added');
});

export const updateItineraryDay = asyncHandler(async (req, res) => {
  const day = await tourPackageService.updateItineraryDay(req.params.tourId, req.params.day, req.body, req.user.id);
  return success(res, { data: day, message: 'Itinerary day updated' });
});

export const removeItineraryDay = asyncHandler(async (req, res) => {
  await tourPackageService.removeItineraryDay(req.params.tourId, req.params.day, req.user.id);
  return success(res, { message: 'Itinerary day removed' });
});

// ---- Images ----

export const listImages = asyncHandler(async (req, res) => {
  const images = await tourPackageService.listImages(req.params.tourId);
  return success(res, { data: images });
});

export const addImage = asyncHandler(async (req, res) => {
  const image = await tourPackageService.addImage(req.params.tourId, req.body, req.user.id);
  return created(res, image, 'Tour image added');
});

export const updateImage = asyncHandler(async (req, res) => {
  const image = await tourPackageService.updateImage(req.params.tourId, req.params.imageId, req.body, req.user.id);
  return success(res, { data: image, message: 'Tour image updated' });
});

export const removeImage = asyncHandler(async (req, res) => {
  await tourPackageService.removeImage(req.params.tourId, req.params.imageId, req.user.id);
  return success(res, { message: 'Tour image removed' });
});
