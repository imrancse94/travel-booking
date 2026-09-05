import * as roleRepository from '../repositories/roleRepository.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created } from '../utils/apiResponse.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { recordAudit } from '../services/auditService.js';

export const listRoles = asyncHandler(async (req, res) => {
  const roles = await roleRepository.listRoles();
  return success(res, { data: roles.map((r) => ({ ...r, permissions: r.rolePermissions.map((rp) => rp.permission) })) });
});

export const listPermissions = asyncHandler(async (req, res) => {
  const permissions = await roleRepository.listPermissions();
  return success(res, { data: permissions });
});

export const createRole = asyncHandler(async (req, res) => {
  const { name, description, permissionIds = [] } = req.body;
  const role = await roleRepository.createRole({ name, description }, permissionIds);
  await recordAudit({ req, action: 'role.created', entity: 'Role', entityId: role.id, newValue: { name } });
  return created(res, role, 'Role created');
});

export const updateRolePermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissionIds } = req.body;

  const role = await roleRepository.findRoleById(id);
  if (!role) throw new NotFoundError('Role not found');
  if (role.isSystem) {
    throw new ConflictError('System roles cannot be modified');
  }

  await roleRepository.replaceRolePermissions(id, permissionIds);

  await recordAudit({ req, action: 'role.permissions_updated', entity: 'Role', entityId: id, newValue: { permissionIds } });
  return success(res, { message: 'Role permissions updated' });
});
