import { bcryptHasher } from '../lib/BcryptHasher.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import * as userRepository from '../repositories/userRepository.js';
import * as roleRepository from '../repositories/roleRepository.js';
import { ROLES } from '../config/permissions.js';
import { recordAudit } from './auditService.js';

function sanitize(user) {
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, refreshTokenHash, emailVerifyToken, passwordResetToken, ...safe } = user;
  return safe;
}

/**
 * `query.excludeUserId` leaves the caller's own account out of the list --
 * the users admin section manages other accounts, not the one you're signed
 * in as (that's your own profile, elsewhere), and it also means there's
 * nothing to accidentally delete-your-own-account from this screen.
 */
export async function listUsers(query) {
  const { items, total } = await userRepository.list(query);
  return { items: items.map(sanitize), total };
}

export async function getUser(id) {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError('User not found');
  return sanitize(user);
}

export async function createUser({ roleIds = [], password, ...data }, actorId) {
  const existing = await userRepository.findByEmail(data.email);
  if (existing) throw new ConflictError('A user with this email already exists');

  const passwordHash = await bcryptHasher.hash(password);
  const user = await userRepository.createUser(
    { ...data, passwordHash, isEmailVerified: true },
    roleIds
  );

  await recordAudit({ userId: actorId, action: 'user.created', entity: 'User', entityId: user.id, newValue: { email: user.email } });
  return sanitize(user);
}

/** True when the user (as returned by userRepository.findById) holds the Super Admin role. */
function holdsSuperAdmin(user) {
  return Boolean(user?.userRoles?.some((ur) => ur.role?.name === ROLES.SUPER_ADMIN));
}

export async function updateUser(id, { roleIds, ...data }, actorId) {
  const existing = await userRepository.findById(id);
  if (!existing) throw new NotFoundError('User not found');

  // The Super Admin account and its role are permanent: nobody can strip the
  // role from it or deactivate it, so the system can never lose its only way
  // to administer itself.
  if (holdsSuperAdmin(existing)) {
    if (roleIds) {
      const superAdminRole = await roleRepository.findRoleByName(ROLES.SUPER_ADMIN);
      if (!superAdminRole || !roleIds.includes(superAdminRole.id)) {
        throw new ConflictError('The Super Admin role cannot be removed from a Super Admin');
      }
    }
    if (data.status && data.status !== 'active') {
      throw new ConflictError('A Super Admin account cannot be deactivated');
    }
  }

  await userRepository.updateUser(id, data);
  if (roleIds) {
    await userRepository.replaceUserRoles(id, roleIds);
  }

  await recordAudit({ userId: actorId, action: 'user.updated', entity: 'User', entityId: id, oldValue: existing, newValue: data });
  return sanitize(await userRepository.findById(id));
}

export async function deleteUser(id, actorId) {
  // Checked before the lookup so the answer does not depend on the account
  // still existing: deleting yourself would revoke your own access mid-session
  // and, for the last Super Admin, lock everyone out of the admin area.
  if (id === actorId) {
    throw new ValidationError('You cannot delete your own account');
  }

  const existing = await userRepository.findById(id);
  if (!existing) throw new NotFoundError('User not found');

  if (holdsSuperAdmin(existing)) {
    throw new ConflictError('A Super Admin account cannot be deleted');
  }

  await userRepository.softDeleteUser(id);
  await recordAudit({ userId: actorId, action: 'user.deleted', entity: 'User', entityId: id });
}
