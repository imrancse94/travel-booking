import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { idParamSchema, updateVehicleSchema } from '../../../../../../server/validators/transport.validators.js';
import * as transportService from '../../../../../../server/services/transportService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'transport.view');
  const params = parseParams(await ctx.params, idParamSchema);
  const vehicle = await transportService.getVehicle(params.id);
  return success({ data: vehicle });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'transport.update');
  const params = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateVehicleSchema);
  const vehicle = await transportService.updateVehicle(params.id, body, user.id);
  return success({ data: vehicle, message: 'Vehicle updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'transport.delete');
  const params = parseParams(await ctx.params, idParamSchema);
  await transportService.deleteVehicle(params.id, user.id);
  return success({ message: 'Vehicle deleted' });
});
