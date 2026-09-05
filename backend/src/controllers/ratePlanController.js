import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as ratePlanService from '../services/ratePlanService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await ratePlanService.listRatePlans({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const plan = await ratePlanService.getRatePlan(req.params.id);
  return success(res, { data: plan });
});

export const create = asyncHandler(async (req, res) => {
  const plan = await ratePlanService.createRatePlan(req.body, req.user.id);
  return created(res, plan, 'Rate plan created');
});

export const update = asyncHandler(async (req, res) => {
  const plan = await ratePlanService.updateRatePlan(req.params.id, req.body, req.user.id);
  return success(res, { data: plan, message: 'Rate plan updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await ratePlanService.deleteRatePlan(req.params.id, req.user.id);
  return success(res, { message: 'Rate plan deleted' });
});

// -- Room rates, un-nested (/rate-plans/room-rates) --

export const listRoomRates = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await ratePlanService.listRoomRates({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const createRoomRate = asyncHandler(async (req, res) => {
  const { roomTypeId, ...data } = req.body;
  const rate = await ratePlanService.createRoomRate(roomTypeId, data, req.user.id);
  return created(res, rate, 'Room rate created');
});

export const getRoomRate = asyncHandler(async (req, res) => {
  const rate = await ratePlanService.getRoomRate(req.params.id);
  return success(res, { data: rate });
});

export const updateRoomRate = asyncHandler(async (req, res) => {
  const rate = await ratePlanService.updateRoomRate(req.params.id, req.body, req.user.id);
  return success(res, { data: rate, message: 'Room rate updated' });
});

export const deleteRoomRate = asyncHandler(async (req, res) => {
  await ratePlanService.deleteRoomRate(req.params.id, req.user.id);
  return success(res, { message: 'Room rate deleted' });
});
