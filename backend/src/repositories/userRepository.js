import { prisma } from '../config/prisma.js';

const withRoles = { userRoles: { include: { role: true } } };

export async function findById(id) {
  return prisma.user.findFirst({ where: { id, deletedAt: null }, include: withRoles });
}

export async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export async function list({ page, limit, skip, search, role, status }) {
  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(role ? { userRoles: { some: { role: { name: role } } } } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, include: withRoles, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
}

export async function createUser(data) {
  return prisma.user.create({ data, include: withRoles });
}

export async function updateUser(id, data) {
  return prisma.user.update({ where: { id }, data, include: withRoles });
}

export async function softDeleteUser(id) {
  return prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'inactive' } });
}

export async function replaceUserRoles(id, roleIds) {
  return prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: id } }),
    prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) }),
  ]);
}
