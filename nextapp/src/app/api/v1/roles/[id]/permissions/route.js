import { apiHandler } from '../../../../../../server/lib/apiHandler.js';
import { parseBody, parseParams } from '../../../../../../server/lib/parseRequest.js';
import { success } from '../../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { updateRolePermissionsSchema, idParamSchema } from '../../../../../../server/validators/role.validators.js';
import * as roleService from '../../../../../../server/services/roleService.js';

export const PUT = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'roles.update');
  const { id } = parseParams(await ctx.params, idParamSchema);
  const { permissionIds } = await parseBody(request, updateRolePermissionsSchema);
  await roleService.updateRolePermissions(id, permissionIds, user.id);
  return success({ message: 'Role permissions updated' });
});
