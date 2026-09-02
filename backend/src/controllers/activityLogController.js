import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import * as activityLogService from '../services/activityLogService.js';

export const list = asyncHandler(async (req, res) => {
  const { items, total, page, limit, date, truncated } = await activityLogService.listActivityLogs(req.query);
  return success(res, {
    data: items,
    meta: { pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, date, truncated },
  });
});

export const dates = asyncHandler(async (req, res) => {
  return success(res, { data: await activityLogService.listAvailableDates() });
});
