import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema, updateTourPackageSchema } from '../../../../../server/validators/tourPackage.validators.js';
import * as tourPackageService from '../../../../../server/services/tourPackageService.js';

export const GET = apiHandler(async (request, ctx) => {
  const params = parseParams(await ctx.params, idParamSchema);
  const tourPackage = await tourPackageService.getTourPackage(params.id);
  return success({ data: tourPackage });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'tours.update');
  const params = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateTourPackageSchema);
  const tourPackage = await tourPackageService.updateTourPackage(params.id, body, user.id);
  return success({ data: tourPackage, message: 'Tour package updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'tours.delete');
  const params = parseParams(await ctx.params, idParamSchema);
  await tourPackageService.deleteTourPackage(params.id, user.id);
  return success({ message: 'Tour package deleted' });
});
