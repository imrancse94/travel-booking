import { and, count, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { roles, userRoles, users } from '../db/schema.js';

const withRoles = { userRoles: { with: { role: true } } };

const notDeleted = isNull(users.deletedAt);

export async function findById(id) {
  const row = await db.query.users.findFirst({
    where: and(eq(users.id, id), notDeleted),
    with: withRoles,
  });
  return row ?? null;
}

export async function findByEmail(email) {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

/** `role` filtered on `userRoles: { some: { role: { name } } }` in Prisma. */
async function userIdsWithRole(roleName) {
  const rows = await db
    .select({ id: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(roles.name, roleName));
  return rows.map((r) => r.id);
}

export async function list({ limit, skip, search, role, status }) {
  const roleUserIds = role ? await userIdsWithRole(role) : null;
  if (roleUserIds && roleUserIds.length === 0) return { items: [], total: 0 };

  const filters = [
    notDeleted,
    status ? eq(users.status, status) : null,
    roleUserIds ? inArray(users.id, roleUserIds) : null,
    search
      ? or(
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      : null,
  ].filter(Boolean);
  const where = and(...filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.query.users.findMany({ where, with: withRoles, orderBy: desc(users.createdAt), limit, offset: skip }),
    db.select({ value: count() }).from(users).where(where),
  ]);

  return { items, total };
}

/**
 * `roleIds` is a separate argument, not a nested write.
 *
 * The caller used to pass Prisma's `userRoles: { create: [...] }` inside `data`.
 * Drizzle has no nested writes and simply ignores an unknown key, so that
 * silently created users with no roles at all -- they authenticated fine and
 * then failed every permission check.
 */
export async function createUser(data, roleIds = []) {
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values(data).returning();
    if (roleIds.length) {
      await tx.insert(userRoles).values(roleIds.map((roleId) => ({ userId: created.id, roleId })));
    }
    const row = await tx.query.users.findFirst({
      where: (u, { eq: e }) => e(u.id, created.id),
      with: withRoles,
    });
    return row ?? null;
  });
}

export async function updateUser(id, data) {
  const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return updated ? findById(updated.id) : null;
}

export async function softDeleteUser(id) {
  const [row] = await db
    .update(users)
    .set({ deletedAt: new Date(), status: 'inactive' })
    .where(eq(users.id, id))
    .returning();
  return row ?? null;
}

export async function replaceUserRoles(id, roleIds) {
  // Prisma ran these as an array $transaction; the Drizzle equivalent is an
  // explicit transaction so the delete and insert still succeed or fail together.
  return db.transaction(async (tx) => {
    await tx.delete(userRoles).where(eq(userRoles.userId, id));
    if (roleIds.length === 0) return [];
    return tx
      .insert(userRoles)
      .values(roleIds.map((roleId) => ({ userId: id, roleId })))
      .returning();
  });
}
