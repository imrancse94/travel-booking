import * as roleRepository from '../repositories/roleRepository.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { recordAudit } from './auditService.js';

export async function listRoles() {
  const roles = await roleRepository.listRoles();
  return roles.map((r) => ({ ...r, permissions: r.rolePermissions.map((rp) => rp.permission) }));
}

export async function listPermissions() {
  return roleRepository.listPermissions();
}

export async function createRole({ name, description, permissionIds = [] }, actorId) {
  const role = await roleRepository.createRole({ name, description }, permissionIds);
  await recordAudit({ userId: actorId, action: 'role.created', entity: 'Role', entityId: role.id, newValue: { name } });
  return role;
}

/**
 * Roles cannot be deleted through the app at all; this exists so any future
 * delete path has to go through the same guard. System roles -- Super Admin
 * above all -- are permanent.
 */
export async function assertRoleDeletable(id) {
  const role = await roleRepository.findRoleById(id);
  if (!role) throw new NotFoundError('Role not found');
  if (role.isSystem) throw new ConflictError('System roles, including Super Admin, cannot be deleted');
  return role;
}

export async function updateRolePermissions(id, permissionIds, actorId) {
  const role = await roleRepository.findRoleById(id);
  if (!role) throw new NotFoundError('Role not found');
  if (role.isSystem) {
    throw new ConflictError('System roles cannot be modified');
  }

  await roleRepository.replaceRolePermissions(id, permissionIds);

  await recordAudit({ userId: actorId, action: 'role.permissions_updated', entity: 'Role', entityId: id, newValue: { permissionIds } });
}
