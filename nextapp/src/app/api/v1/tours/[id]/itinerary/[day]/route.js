import { apiHandler } from '../../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../../server/middleware/withPermission.js';
import {
  itineraryDayParamSchema,
  updateItineraryDaySchema,
} from '../../../../../../../server/validators/tourPackage.validators.js';
import * as tourPackageService from '../../../../../../../server/services/tourPackageService.js';

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'tours.update');
  const { id, day } = await ctx.params;
  const params = parseParams({ tourId: id, day }, itineraryDayParamSchema);
  const body = await parseBody(request, updateItineraryDaySchema);
  const updated = await tourPackageService.updateItineraryDay(params.tourId, params.day, body, user.id);
  return success({ data: updated, message: 'Itinerary day updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'tours.delete');
  const { id, day } = await ctx.params;
  const params = parseParams({ tourId: id, day }, itineraryDayParamSchema);
  await tourPackageService.removeItineraryDay(params.tourId, params.day, user.id);
  return success({ message: 'Itinerary day removed' });
});
