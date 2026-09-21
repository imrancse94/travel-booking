import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema, updateDestinationSchema } from '../../../../../server/validators/destination.validators.js';
import * as destinationService from '../../../../../server/services/destinationService.js';

export const GET = apiHandler(async (request, ctx) => {
  const params = parseParams(await ctx.params, idParamSchema);
  const destination = await destinationService.getDestination(params.id);
  return success({ data: destination });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'destinations.update');
  const params = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateDestinationSchema);
  const destination = await destinationService.updateDestination(params.id, body, user.id);
  return success({ data: destination, message: 'Destination updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'destinations.delete');
  const params = parseParams(await ctx.params, idParamSchema);
  await destinationService.deleteDestination(params.id, user.id);
  return success({ message: 'Destination deleted' });
});
