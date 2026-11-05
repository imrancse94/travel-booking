import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success, created } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import {
  tourIdParamSchema,
  createTourImageSchema,
} from '../../../../../../server/validators/tourPackage.validators.js';
import * as tourPackageService from '../../../../../../server/services/tourPackageService.js';

export const GET = apiHandler(async (request, ctx) => {
  const { id } = await ctx.params;
  const params = parseParams({ tourId: id }, tourIdParamSchema);
  const images = await tourPackageService.listImages(params.tourId);
  return success({ data: images });
});

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'tours.update');
  const { id } = await ctx.params;
  const params = parseParams({ tourId: id }, tourIdParamSchema);
  const body = await parseBody(request, createTourImageSchema);
  const image = await tourPackageService.addImage(params.tourId, body, user.id);
  return created(image, 'Tour image added');
});
