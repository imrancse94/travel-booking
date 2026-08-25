import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as serviceCatalogService from '../services/serviceCatalogService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await serviceCatalogService.listServices({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const service = await serviceCatalogService.getService(req.params.id);
  return success(res, { data: service });
});

export const create = asyncHandler(async (req, res) => {
  const service = await serviceCatalogService.createService(req.body, req.user.id);
  return created(res, service, 'Service created');
});

export const update = asyncHandler(async (req, res) => {
  const service = await serviceCatalogService.updateService(req.params.id, req.body, req.user.id);
  return success(res, { data: service, message: 'Service updated' });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await serviceCatalogService.deleteService(req.params.id, req.user.id);
  const message = result ? 'Service deactivated (in use by existing bookings)' : 'Service deleted';
  return success(res, { data: result, message });
});
