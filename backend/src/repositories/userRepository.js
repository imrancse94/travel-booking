import { and, count, desc, eq, gt, ilike, inArray, isNull, ne, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers, roles, userRoles, users } from '../db/schema.js';

const withRoles = { userRoles: { with: { role: true } } };

const notDeleted = isNull(users.deletedAt);

export async function findById(id) {
  const row = await db.query.users.findFirst({
    where: and(eq(users.id, id), notDeleted),
    with: withRoles,
  });
  return row ?? null;
}

/**
 * The shape `authenticate` needs: the user plus every permission granted by
 * every role they hold. Drizzle resolves the nested `with` in a single query,
 * so this stays one round trip on a middleware that runs for every request.
 */
export async function findByIdWithPermissions(id) {
  const row = await db.query.users.findFirst({
    where: and(eq(users.id, id), notDeleted),
    with: { userRoles: { with: { role: { with: { rolePermissions: { with: { permission: true } } } } } } },
  });
  return row ?? null;
}

export async function findByEmail(email) {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

/** login's lookup: the credentials plus every permission the account grants. */
export async function findByEmailWithPermissions(email) {
  const row = await db.query.users.findFirst({
    where: eq(users.email, email),
    with: { userRoles: { with: { role: { with: { rolePermissions: { with: { permission: true } } } } } } },
  });
  return row ?? null;
}

/**
 * The row as stored, including soft-deleted accounts. The auth flows check
 * `deletedAt` themselves so they can answer with the same "invalid" message
 * whether the account is missing, deleted or inactive.
 */
export async function findRawById(id) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

/** Looks a user up by an unexpired one-time token (password reset, email verify). */
export async function findByLiveToken(column, token) {
  const expiryColumn = column === 'passwordResetToken' ? users.passwordResetExpires : users.emailVerifyExpires;
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users[column], token), gt(expiryColumn, new Date())))
    .limit(1);
  return row ?? null;
}

/**
 * Writes auth bookkeeping columns (token hashes, reset tokens, lastLoginAt).
 * Separate from updateUser, which re-reads the user with their roles -- these
 * run on every login and refresh and have no use for that second query.
 */
export async function updateAuthFields(id, data) {
  const [row] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return row ?? null;
}

/**
 * Self-registration: the user, their Customer role and their customer profile
 * are one unit of work. Prisma expressed the last two as nested `create`s on
 * the user; Drizzle has no nested writes, so they are explicit inserts inside
 * a transaction -- which also means a failure part-way leaves no orphan user.
 */
export async function createCustomerAccount(userData, { roleId, customer }) {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values(userData).returning();
    if (roleId) {
      await tx.insert(userRoles).values({ userId: user.id, roleId });
    }
    await tx.insert(customers).values({ ...customer, userId: user.id });
    return user;
  });
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

export async function list({ limit, skip, search, role, status, excludeUserId }) {
  const roleUserIds = role ? await userIdsWithRole(role) : null;
  if (roleUserIds && roleUserIds.length === 0) return { items: [], total: 0 };

  const filters = [
    notDeleted,
    status ? eq(users.status, status) : null,
    roleUserIds ? inArray(users.id, roleUserIds) : null,
    excludeUserId ? ne(users.id, excludeUserId) : null,
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
