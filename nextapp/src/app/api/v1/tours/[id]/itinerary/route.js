import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success, created } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import {
  tourIdParamSchema,
  createItineraryDaySchema,
  replaceItinerarySchema,
} from '../../../../../../server/validators/tourPackage.validators.js';
import * as tourPackageService from '../../../../../../server/services/tourPackageService.js';

export const GET = apiHandler(async (request, ctx) => {
  const { id } = await ctx.params;
  const params = parseParams({ tourId: id }, tourIdParamSchema);
  const itinerary = await tourPackageService.listItinerary(params.tourId);
  return success({ data: itinerary });
});

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'tours.update');
  const { id } = await ctx.params;
  const params = parseParams({ tourId: id }, tourIdParamSchema);
  const body = await parseBody(request, createItineraryDaySchema);
  const day = await tourPackageService.addItineraryDay(params.tourId, body, user.id);
  return created(day, 'Itinerary day added');
});

/** Whole-list replace -- the client's day-builder UI uses this via saveTourPackageAction (Server Action), this stays for non-browser API consumers. */
export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'tours.update');
  const { id } = await ctx.params;
  const params = parseParams({ tourId: id }, tourIdParamSchema);
  const { days } = await parseBody(request, replaceItinerarySchema);
  const itinerary = await tourPackageService.replaceItinerary(params.tourId, days, user.id);
  return success({ data: itinerary, message: 'Itinerary updated' });
});
