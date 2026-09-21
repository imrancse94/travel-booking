import { apiHandler } from '../../../../../../../server/lib/apiHandler.js';
import { parseParams } from '../../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../../server/middleware/withPermission.js';
import { hotelAmenityIdParamSchema } from '../../../../../../../server/validators/hotel.validators.js';
import * as hotelService from '../../../../../../../server/services/hotelService.js';

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'hotels.update');
  const { id, amenityId } = parseParams(await ctx.params, hotelAmenityIdParamSchema);
  await hotelService.unassignAmenity(id, amenityId, user.id);
  return success({ message: 'Amenity unassigned from hotel' });
});
