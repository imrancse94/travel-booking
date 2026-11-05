import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { idParamSchema, updateServiceSchema } from '../../../../../server/validators/service.validators.js';
import * as serviceCatalogService from '../../../../../server/services/serviceCatalogService.js';

export const GET = apiHandler(async (request, ctx) => {
  const params = parseParams(await ctx.params, idParamSchema);
  const service = await serviceCatalogService.getService(params.id);
  return success({ data: service });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'services.update');
  const params = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateServiceSchema);
  const service = await serviceCatalogService.updateService(params.id, body, user.id);
  return success({ data: service, message: 'Service updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'services.delete');
  const params = parseParams(await ctx.params, idParamSchema);
  const result = await serviceCatalogService.deleteService(params.id, user.id);
  const message = result ? 'Service deactivated (in use by existing bookings)' : 'Service deleted';
  return success({ data: result, message });
});
