import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody } from '../../../../server/lib/parseRequest.js';
import { success, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { createRoleSchema } from '../../../../server/validators/role.validators.js';
import * as roleService from '../../../../server/services/roleService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'roles.view');
  const roles = await roleService.listRoles();
  return success({ data: roles });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'roles.create');
  const body = await parseBody(request, createRoleSchema);
  const role = await roleService.createRole(body, user.id);
  return created(role, 'Role created');
});
