import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { created, success } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import {
  idParamSchema,
  assignAmenitySchema,
  setAmenitiesSchema,
} from '../../../../../../server/validators/hotel.validators.js';
import * as hotelService from '../../../../../../server/services/hotelService.js';

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'hotels.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, assignAmenitySchema);
  const link = await hotelService.assignAmenity(id, body.amenityId, user.id);
  return created(link, 'Amenity assigned to hotel');
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'hotels.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, setAmenitiesSchema);
  const hotel = await hotelService.setAmenities(id, body.amenityIds, user.id);
  return success({ data: hotel, message: 'Amenities updated' });
});
