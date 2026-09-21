import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { updateUserSchema, idParamSchema } from '../../../../../server/validators/user.validators.js';
import * as userService from '../../../../../server/services/userService.js';

export const GET = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'users.view');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const found = await userService.getUser(id);
  return success({ data: found });
});

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'users.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const body = await parseBody(request, updateUserSchema);
  const updated = await userService.updateUser(id, body, user.id);
  return success({ data: updated, message: 'User updated' });
});

export const DELETE = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'users.delete');
  const { id } = parseParams(await ctx.params, idParamSchema);
  await userService.deleteUser(id, user.id);
  return success({ message: 'User deleted' });
});
