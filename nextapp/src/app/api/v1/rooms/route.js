import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createRoomSchema, listRoomsQuerySchema } from '../../../../server/validators/room.validators.js';
import * as roomService from '../../../../server/services/roomService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'rooms.view');
  const query = parseQuery(request, listRoomsQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await roomService.listRooms({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'rooms.create');
  const body = await parseBody(request, createRoomSchema);
  const room = await roomService.createRoom(body, user.id);
  return created(room, 'Room created');
});
