import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { created } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { idParamSchema, addRoomTypeImageSchema } from '../../../../../../server/validators/roomType.validators.js';
import * as roomTypeService from '../../../../../../server/services/roomTypeService.js';

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'room_types.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, addRoomTypeImageSchema);
  const image = await roomTypeService.addImage(id, body, user.id);
  return created(image, 'Room type image added');
});
