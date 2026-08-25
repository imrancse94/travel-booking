import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as amenityService from '../services/amenityService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await amenityService.listAmenities({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const amenity = await amenityService.getAmenity(req.params.id);
  return success(res, { data: amenity });
});

export const create = asyncHandler(async (req, res) => {
  const amenity = await amenityService.createAmenity(req.body, req.user.id);
  return created(res, amenity, 'Amenity created');
});

export const update = asyncHandler(async (req, res) => {
  const amenity = await amenityService.updateAmenity(req.params.id, req.body, req.user.id);
  return success(res, { data: amenity, message: 'Amenity updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await amenityService.deleteAmenity(req.params.id, req.user.id);
  return success(res, { message: 'Amenity deleted' });
});
