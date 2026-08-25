import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as commissionService from '../services/commissionService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await commissionService.listCommissions({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const commission = await commissionService.getCommission(req.params.id);
  return success(res, { data: commission });
});

export const create = asyncHandler(async (req, res) => {
  const commission = await commissionService.createCommission(req.body, req.user.id);
  return created(res, commission, 'Commission created');
});

export const updateStatus = asyncHandler(async (req, res) => {
  const commission = await commissionService.updateCommissionStatus(req.params.id, req.body, req.user.id);
  return success(res, { data: commission, message: 'Commission status updated' });
});
