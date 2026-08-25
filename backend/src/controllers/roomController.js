import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as roomService from '../services/roomService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await roomService.listRooms({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const room = await roomService.getRoom(req.params.id);
  return success(res, { data: room });
});

export const create = asyncHandler(async (req, res) => {
  const room = await roomService.createRoom(req.body, req.user.id);
  return created(res, room, 'Room created');
});

export const update = asyncHandler(async (req, res) => {
  const room = await roomService.updateRoom(req.params.id, req.body, req.user.id);
  return success(res, { data: room, message: 'Room updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await roomService.deleteRoom(req.params.id, req.user.id);
  return success(res, { message: 'Room deleted' });
});
