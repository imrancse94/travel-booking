import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { idParamSchema, updateDriverSchema } from '../../../../../../server/validators/transport.validators.js';
import * as transportService from '../../../../../../server/services/transportService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'transport.view');
  const params = parseParams(await ctx.params, idParamSchema);
  const driver = await transportService.getDriver(params.id);
  return success({ data: driver });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'transport.update');
  const params = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateDriverSchema);
  const driver = await transportService.updateDriver(params.id, body, user.id);
  return success({ data: driver, message: 'Driver updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'transport.delete');
  const params = parseParams(await ctx.params, idParamSchema);
  await transportService.deleteDriver(params.id, user.id);
  return success({ message: 'Driver deactivated' });
});
