import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema, updateAmenitySchema } from '../../../../../server/validators/amenity.validators.js';
import * as amenityService from '../../../../../server/services/amenityService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'amenities.view');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const amenity = await amenityService.getAmenity(id);
  return success({ data: amenity });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'amenities.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateAmenitySchema);
  const amenity = await amenityService.updateAmenity(id, body, user.id);
  return success({ data: amenity, message: 'Amenity updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'amenities.delete');
  const { id } = parseParams(await ctx.params, idParamSchema);
  await amenityService.deleteAmenity(id, user.id);
  return success({ message: 'Amenity deleted' });
});
