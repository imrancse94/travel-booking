'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createRoleSchema, updateRolePermissionsSchema } from '../validators/role.validators.js';
import * as roleService from '../services/roleService.js';

export async function createRoleAction(payload) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'roles.create');
    return roleService.createRole(parse('body', payload, createRoleSchema), user.id);
  });
}

export async function updateRolePermissionsAction(roleId, permissionIds) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'roles.update');
    const { permissionIds: parsedIds } = parse('body', { permissionIds }, updateRolePermissionsSchema);
    await roleService.updateRolePermissions(roleId, parsedIds, user.id);
    return null;
  });
}
