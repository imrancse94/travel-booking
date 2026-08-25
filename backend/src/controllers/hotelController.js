import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as hotelService from '../services/hotelService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await hotelService.listHotels({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const hotel = await hotelService.getHotel(req.params.id);
  return success(res, { data: hotel });
});

export const create = asyncHandler(async (req, res) => {
  const hotel = await hotelService.createHotel(req.body, req.user.id);
  return created(res, hotel, 'Hotel created');
});

export const update = asyncHandler(async (req, res) => {
  const hotel = await hotelService.updateHotel(req.params.id, req.body, req.user.id);
  return success(res, { data: hotel, message: 'Hotel updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await hotelService.deleteHotel(req.params.id, req.user.id);
  return success(res, { message: 'Hotel deleted' });
});

export const addImage = asyncHandler(async (req, res) => {
  const image = await hotelService.addHotelImage(req.params.id, req.body, req.user.id);
  return created(res, image, 'Hotel image added');
});

export const removeImage = asyncHandler(async (req, res) => {
  await hotelService.removeHotelImage(req.params.id, req.params.imageId, req.user.id);
  return success(res, { message: 'Hotel image removed' });
});

export const assignAmenity = asyncHandler(async (req, res) => {
  const link = await hotelService.assignAmenity(req.params.id, req.body.amenityId, req.user.id);
  return created(res, link, 'Amenity assigned to hotel');
});

export const unassignAmenity = asyncHandler(async (req, res) => {
  await hotelService.unassignAmenity(req.params.id, req.params.amenityId, req.user.id);
  return success(res, { message: 'Amenity unassigned from hotel' });
});

export const setAmenities = asyncHandler(async (req, res) => {
  const hotel = await hotelService.setAmenities(req.params.id, req.body.amenityIds, req.user.id);
  return success(res, { data: hotel, message: 'Amenities updated' });
});
