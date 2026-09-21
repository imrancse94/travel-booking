import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema, updateRoomSchema } from '../../../../../server/validators/room.validators.js';
import * as roomService from '../../../../../server/services/roomService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'rooms.view');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const room = await roomService.getRoom(id);
  return success({ data: room });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'rooms.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateRoomSchema);
  const room = await roomService.updateRoom(id, body, user.id);
  return success({ data: room, message: 'Room updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'rooms.delete');
  const { id } = parseParams(await ctx.params, idParamSchema);
  await roomService.deleteRoom(id, user.id);
  return success({ message: 'Room deleted' });
});
