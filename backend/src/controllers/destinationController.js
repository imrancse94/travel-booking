import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as destinationService from '../services/destinationService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await destinationService.listDestinations({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const destination = await destinationService.getDestination(req.params.id);
  return success(res, { data: destination });
});

export const create = asyncHandler(async (req, res) => {
  const destination = await destinationService.createDestination(req.body, req.user.id);
  return created(res, destination, 'Destination created');
});

export const update = asyncHandler(async (req, res) => {
  const destination = await destinationService.updateDestination(req.params.id, req.body, req.user.id);
  return success(res, { data: destination, message: 'Destination updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await destinationService.deleteDestination(req.params.id, req.user.id);
  return success(res, { message: 'Destination deleted' });
});
