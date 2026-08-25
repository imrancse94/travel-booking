import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/config/prisma.js';
import { bcryptHasher } from '../../src/lib/BcryptHasher.js';
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from '../../src/config/permissions.js';

// Upserts the canonical permission/role set (same data as seeds/index.js).
// Idempotent, so every test file can call this in beforeAll without
// stepping on other test files sharing the same test database.
export async function ensureRolesAndPermissions() {
  for (const name of PERMISSIONS) {
    const [module] = name.split('.');
    await prisma.permission.upsert({ where: { name }, update: {}, create: { name, module } });
  }

  await prisma.role.upsert({
    where: { name: ROLES.SUPER_ADMIN },
    update: {},
    create: { name: ROLES.SUPER_ADMIN, description: 'Full system access', isSystem: true },
  });

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: roleName, isSystem: true },
    });
    const permissions = await prisma.permission.findMany({ where: { name: { in: permissionNames } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
}

async function createUserWithRole({ roleName, emailPrefix, password = 'Test@12345' }) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  const email = `${emailPrefix}-${randomUUID()}@example.test`;
  const passwordHash = await bcryptHasher.hash(password);

  const user = await prisma.user.create({
    data: {
      firstName: 'Test',
      lastName: roleName,
      email,
      passwordHash,
      isEmailVerified: true,
      status: 'active',
      userRoles: { create: { roleId: role.id } },
    },
  });

  return { user, email, password };
}

export async function createAdmin() {
  return createUserWithRole({ roleName: ROLES.SUPER_ADMIN, emailPrefix: 'admin' });
}

export async function createCustomerUser() {
  const { user, email, password } = await createUserWithRole({ roleName: ROLES.CUSTOMER, emailPrefix: 'customer' });
  const customer = await prisma.customer.create({
    data: { userId: user.id, firstName: user.firstName, lastName: user.lastName, email },
  });
  return { user, email, password, customer };
}

// Builds a bookable hotel: one active hotel, one room type (max 4 adults so
// tests don't need to fuss with occupancy), 2 physical rooms, and a
// room-only rate plan priced for a wide date window.
export async function createBookableHotel({ price = 100, currency = 'USD', roomCount = 2 } = {}) {
  const hotel = await prisma.hotel.create({
    data: { name: `Test Hotel ${randomUUID()}`, city: 'Testville', country: 'Testland', status: 'active' },
  });

  const roomType = await prisma.roomType.create({
    data: { hotelId: hotel.id, name: 'Standard', maxAdults: 4, maxChildren: 2, totalRooms: roomCount },
  });

  const rooms = [];
  for (let i = 0; i < roomCount; i += 1) {
    rooms.push(
      await prisma.room.create({
        data: { roomTypeId: roomType.id, roomNumber: `10${i + 1}`, status: 'available' },
      })
    );
  }

  const ratePlan = await prisma.ratePlan.create({ data: { name: 'Room Only', type: 'room_only' } });
  await prisma.roomRate.create({
    data: {
      roomTypeId: roomType.id,
      ratePlanId: ratePlan.id,
      startDate: new Date('2020-01-01'),
      endDate: new Date('2035-01-01'),
      price: price.toString(),
      extraAdultPrice: '0',
      extraChildPrice: '0',
      currency,
      priority: 0,
    },
  });

  return { hotel, roomType, rooms, ratePlan };
}

export function sampleGuest(overrides = {}) {
  return { firstName: 'Guest', lastName: 'One', isPrimary: true, ...overrides };
}
