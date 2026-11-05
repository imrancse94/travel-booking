import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { created, success } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import {
  idParamSchema,
  assignAmenitySchema,
  setAmenitiesSchema,
} from '../../../../../../server/validators/roomType.validators.js';
import * as roomTypeService from '../../../../../../server/services/roomTypeService.js';

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'room_types.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, assignAmenitySchema);
  const link = await roomTypeService.assignAmenity(id, body.amenityId, user.id);
  return created(link, 'Amenity assigned to room type');
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'room_types.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, setAmenitiesSchema);
  const roomType = await roomTypeService.setAmenities(id, body.amenityIds, user.id);
  return success({ data: roomType, message: 'Amenities updated' });
});
