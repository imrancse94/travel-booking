import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as userService from '../services/userService.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await userService.listUsers({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const user = await userService.getUser(req.params.id);
  return success(res, { data: user });
});

export const create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user.id);
  return created(res, user, 'User created');
});

export const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user.id);
  return success(res, { data: user, message: 'User updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.user.id);
  return success(res, { message: 'User deleted' });
});
