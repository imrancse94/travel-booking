import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as roomTypeService from '../services/roomTypeService.js';
import * as ratePlanService from '../services/ratePlanService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await roomTypeService.listRoomTypes({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const roomType = await roomTypeService.getRoomType(req.params.id);
  return success(res, { data: roomType });
});

export const create = asyncHandler(async (req, res) => {
  const roomType = await roomTypeService.createRoomType(req.body, req.user.id);
  return created(res, roomType, 'Room type created');
});

export const update = asyncHandler(async (req, res) => {
  const roomType = await roomTypeService.updateRoomType(req.params.id, req.body, req.user.id);
  return success(res, { data: roomType, message: 'Room type updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await roomTypeService.deleteRoomType(req.params.id, req.user.id);
  return success(res, { message: 'Room type deleted' });
});

export const addImage = asyncHandler(async (req, res) => {
  const image = await roomTypeService.addImage(req.params.id, req.body, req.user.id);
  return created(res, image, 'Room type image added');
});

export const removeImage = asyncHandler(async (req, res) => {
  await roomTypeService.removeImage(req.params.id, req.params.imageId, req.user.id);
  return success(res, { message: 'Room type image removed' });
});

export const assignAmenity = asyncHandler(async (req, res) => {
  const link = await roomTypeService.assignAmenity(req.params.id, req.body.amenityId, req.user.id);
  return created(res, link, 'Amenity assigned to room type');
});

export const unassignAmenity = asyncHandler(async (req, res) => {
  await roomTypeService.unassignAmenity(req.params.id, req.params.amenityId, req.user.id);
  return success(res, { message: 'Amenity unassigned from room type' });
});

export const setAmenities = asyncHandler(async (req, res) => {
  const roomType = await roomTypeService.setAmenities(req.params.id, req.body.amenityIds, req.user.id);
  return success(res, { data: roomType, message: 'Amenities updated' });
});

// -- Rate plans / room rates nested under a room type --

export const listRates = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await ratePlanService.listRatesForRoomType(req.params.id, { page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const createRate = asyncHandler(async (req, res) => {
  const rate = await ratePlanService.createRoomRate(req.params.id, req.body, req.user.id);
  return created(res, rate, 'Room rate created');
});
