import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema, updateRoomTypeSchema } from '../../../../../server/validators/roomType.validators.js';
import * as roomTypeService from '../../../../../server/services/roomTypeService.js';

export const GET = apiHandler(async (request, ctx) => {
  const { id } = parseParams(await ctx.params, idParamSchema);
  const roomType = await roomTypeService.getRoomType(id);
  return success({ data: roomType });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'room_types.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateRoomTypeSchema);
  const roomType = await roomTypeService.updateRoomType(id, body, user.id);
  return success({ data: roomType, message: 'Room type updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'room_types.delete');
  const { id } = parseParams(await ctx.params, idParamSchema);
  await roomTypeService.deleteRoomType(id, user.id);
  return success({ message: 'Room type deleted' });
});
