import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created } from '../utils/apiResponse.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { recordAudit } from '../services/auditService.js';

export const listRoles = asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({
    include: { rolePermissions: { include: { permission: true } } },
    orderBy: { name: 'asc' },
  });
  return success(res, { data: roles.map((r) => ({ ...r, permissions: r.rolePermissions.map((rp) => rp.permission) })) });
});

export const listPermissions = asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { name: 'asc' }] });
  return success(res, { data: permissions });
});

export const createRole = asyncHandler(async (req, res) => {
  const { name, description, permissionIds = [] } = req.body;
  const role = await prisma.role.create({
    data: { name, description, rolePermissions: { create: permissionIds.map((permissionId) => ({ permissionId })) } },
  });
  await recordAudit({ req, action: 'role.created', entity: 'Role', entityId: role.id, newValue: { name } });
  return created(res, role, 'Role created');
});

export const updateRolePermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissionIds } = req.body;

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new NotFoundError('Role not found');
  if (role.isSystem) {
    throw new ConflictError('System roles cannot be modified');
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })) }),
  ]);

  await recordAudit({ req, action: 'role.permissions_updated', entity: 'Role', entityId: id, newValue: { permissionIds } });
  return success(res, { message: 'Role permissions updated' });
});
