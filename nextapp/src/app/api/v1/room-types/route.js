import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createRoomTypeSchema, listRoomTypesQuerySchema } from '../../../../server/validators/roomType.validators.js';
import * as roomTypeService from '../../../../server/services/roomTypeService.js';

export const GET = apiHandler(async (request) => {
  const query = parseQuery(request, listRoomTypesQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await roomTypeService.listRoomTypes({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'room_types.create');
  const body = await parseBody(request, createRoomTypeSchema);
  const roomType = await roomTypeService.createRoomType(body, user.id);
  return created(roomType, 'Room type created');
});
