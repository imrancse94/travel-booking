import { apiHandler } from '../../../../../../../server/lib/apiHandler.js';
import { parseParams } from '../../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../../server/middleware/withPermission.js';
import { roomTypeAmenityIdParamSchema } from '../../../../../../../server/validators/roomType.validators.js';
import * as roomTypeService from '../../../../../../../server/services/roomTypeService.js';

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'room_types.update');
  const { id, amenityId } = parseParams(await ctx.params, roomTypeAmenityIdParamSchema);
  await roomTypeService.unassignAmenity(id, amenityId, user.id);
  return success({ message: 'Amenity unassigned from room type' });
});
