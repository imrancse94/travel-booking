import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { success } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import * as roleService from '../../../../../server/services/roleService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'roles.view');
  const permissions = await roleService.listPermissions();
  return success({ data: permissions });
});
