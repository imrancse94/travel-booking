import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../src/db/index.js';
import {
  customers,
  hotels,
  permissions,
  ratePlans,
  rolePermissions,
  roles,
  roomRates,
  roomTypes,
  rooms as roomsTable,
  userRoles,
  users,
} from '../../src/db/schema.js';
import { bcryptHasher } from '../../src/lib/BcryptHasher.js';
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from '../../src/config/permissions.js';

// Upserts the canonical permission/role set (same data as seeds/index.js).
// Idempotent, so every test file can call this in beforeAll without
// stepping on other test files sharing the same test database.
async function upsertByName(table, name, data) {
  await db.insert(table).values(data).onConflictDoNothing();
  const [row] = await db.select().from(table).where(eq(table.name, name)).limit(1);
  return row;
}

export async function ensureRolesAndPermissions() {
  for (const name of PERMISSIONS) {
    const [module] = name.split('.');
    await upsertByName(permissions, name, { name, module });
  }

  await upsertByName(roles, ROLES.SUPER_ADMIN, {
    name: ROLES.SUPER_ADMIN,
    description: 'Full system access',
    isSystem: true,
  });

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await upsertByName(roles, roleName, { name: roleName, description: roleName, isSystem: true });
    const granted = await db.select().from(permissions).where(inArray(permissions.name, permissionNames));
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
    if (granted.length) {
      await db
        .insert(rolePermissions)
        .values(granted.map((p) => ({ roleId: role.id, permissionId: p.id })))
        .onConflictDoNothing();
    }
  }
}

async function createUserWithRole({ roleName, emailPrefix, password = 'Test@12345' }) {
  const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
  const email = `${emailPrefix}-${randomUUID()}@example.test`;
  const passwordHash = await bcryptHasher.hash(password);

  const [user] = await db
    .insert(users)
    .values({
      firstName: 'Test',
      lastName: roleName,
      email,
      passwordHash,
      isEmailVerified: true,
      status: 'active',
    })
    .returning();
  await db.insert(userRoles).values({ userId: user.id, roleId: role.id });

  return { user, email, password };
}

export async function createAdmin() {
  return createUserWithRole({ roleName: ROLES.SUPER_ADMIN, emailPrefix: 'admin' });
}

export async function createCustomerUser() {
  const { user, email, password } = await createUserWithRole({ roleName: ROLES.CUSTOMER, emailPrefix: 'customer' });
  const [customer] = await db
    .insert(customers)
    .values({ userId: user.id, firstName: user.firstName, lastName: user.lastName, email })
    .returning();
  return { user, email, password, customer };
}

// Builds a bookable hotel: one active hotel, one room type (max 4 adults so
// tests don't need to fuss with occupancy), 2 physical rooms, and a
// room-only rate plan priced for a wide date window.
export async function createBookableHotel({ price = 100, currency = 'USD', roomCount = 2 } = {}) {
  const [hotel] = await db
    .insert(hotels)
    .values({ name: `Test Hotel ${randomUUID()}`, city: 'Testville', country: 'Testland', status: 'active' })
    .returning();

  const [roomType] = await db
    .insert(roomTypes)
    .values({ hotelId: hotel.id, name: 'Standard', maxAdults: 4, maxChildren: 2, totalRooms: roomCount })
    .returning();

  const rooms = await db
    .insert(roomsTable)
    .values(
      Array.from({ length: roomCount }, (_, i) => ({
        roomTypeId: roomType.id,
        roomNumber: `10${i + 1}`,
        status: 'available',
      }))
    )
    .returning();

  const [ratePlan] = await db.insert(ratePlans).values({ name: 'Room Only', type: 'room_only' }).returning();
  await db.insert(roomRates).values({
    roomTypeId: roomType.id,
    ratePlanId: ratePlan.id,
    startDate: new Date('2020-01-01'),
    endDate: new Date('2035-01-01'),
    price: price.toString(),
    extraAdultPrice: '0',
    extraChildPrice: '0',
    currency,
    priority: 0,
  });

  return { hotel, roomType, rooms, ratePlan };
}

export function sampleGuest(overrides = {}) {
  return { firstName: 'Guest', lastName: 'One', isPrimary: true, ...overrides };
}
