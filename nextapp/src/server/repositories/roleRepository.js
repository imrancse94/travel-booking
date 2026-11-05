import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { permissions, rolePermissions, roles } from '../db/schema.js';

export async function listRoles() {
  return db.query.roles.findMany({
    with: { rolePermissions: { with: { permission: true } } },
    orderBy: asc(roles.name),
  });
}

export async function listPermissions() {
  return db.select().from(permissions).orderBy(asc(permissions.module), asc(permissions.name));
}

export async function findRoleByName(name) {
  const [row] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
  return row ?? null;
}

export async function findRoleById(id) {
  const [row] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  return row ?? null;
}

/**
 * `permissionIds` is a separate argument rather than a nested write.
 *
 * The controller used to pass Prisma's `rolePermissions: { create: [...] }`
 * inside the role data. Drizzle has no nested writes and silently drops an
 * unknown key, which would have created roles that grant nothing.
 */
export async function createRole({ name, description }, permissionIds = []) {
  return db.transaction(async (tx) => {
    const [role] = await tx.insert(roles).values({ name, description }).returning();
    if (permissionIds.length) {
      await tx.insert(rolePermissions).values(permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })));
    }
    return role;
  });
}

export async function replaceRolePermissions(roleId, permissionIds) {
  // Prisma ran the delete and createMany as an array $transaction; the Drizzle
  // equivalent is an explicit transaction so a role is never left with none.
  return db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (permissionIds.length === 0) return [];
    return tx
      .insert(rolePermissions)
      .values(permissionIds.map((permissionId) => ({ roleId, permissionId })))
      .returning();
  });
}
