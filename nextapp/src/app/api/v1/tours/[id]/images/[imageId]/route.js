import { apiHandler } from '../../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../../server/middleware/withPermission.js';
import {
  imageParamSchema,
  updateTourImageSchema,
} from '../../../../../../../server/validators/tourPackage.validators.js';
import * as tourPackageService from '../../../../../../../server/services/tourPackageService.js';

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'tours.update');
  const { id, imageId } = await ctx.params;
  const params = parseParams({ tourId: id, imageId }, imageParamSchema);
  const body = await parseBody(request, updateTourImageSchema);
  const image = await tourPackageService.updateImage(params.tourId, params.imageId, body, user.id);
  return success({ data: image, message: 'Tour image updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'tours.delete');
  const { id, imageId } = await ctx.params;
  const params = parseParams({ tourId: id, imageId }, imageParamSchema);
  await tourPackageService.removeImage(params.tourId, params.imageId, user.id);
  return success({ message: 'Tour image removed' });
});
