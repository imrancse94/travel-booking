import 'dotenv/config';
import { and, eq, inArray } from 'drizzle-orm';
import { db, disconnectDb } from '../src/db/index.js';
import {
  agencies,
  amenities as amenitiesTable,
  destinations,
  hotelAmenities,
  hotels,
  permissions,
  ratePlans as ratePlansTable,
  rolePermissions,
  roles,
  roomRates,
  roomTypes,
  rooms,
  services as servicesTable,
  tourItineraries,
  tourPackages,
  userRoles,
  users,
} from '../src/db/schema.js';
import * as userRepository from '../src/repositories/userRepository.js';
import { BcryptHasher } from '../src/lib/BcryptHasher.js';
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from '../src/config/permissions.js';

const bcryptHasher = new BcryptHasher();

/**
 * Prisma's `upsert` with an empty `update` -- insert if missing, otherwise
 * leave the existing row alone -- and its `findFirst`-then-`create` pattern,
 * both of which the seed leans on so it can be re-run safely.
 */
async function findOrCreate(table, where, data) {
  const [existing] = await db.select().from(table).where(where).limit(1);
  if (existing) return { row: existing, created: false };

  const [inserted] = await db.insert(table).values(data).onConflictDoNothing().returning();
  if (inserted) return { row: inserted, created: true };

  // Lost a race against a concurrent seed; read back whatever won.
  const [row] = await db.select().from(table).where(where).limit(1);
  return { row, created: false };
}

async function seedPermissionsAndRoles() {
  console.log('Seeding permissions...');
  for (const name of PERMISSIONS) {
    const [module] = name.split('.');
    // eslint-disable-next-line no-await-in-loop -- a short, fixed list
    await findOrCreate(permissions, eq(permissions.name, name), { name, module });
  }

  console.log('Seeding roles...');
  const { row: superAdmin } = await findOrCreate(roles, eq(roles.name, ROLES.SUPER_ADMIN), {
    name: ROLES.SUPER_ADMIN,
    description: 'Full system access',
    isSystem: true,
  });

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    // eslint-disable-next-line no-await-in-loop -- a short, fixed list
    const { row: role } = await findOrCreate(roles, eq(roles.name, roleName), {
      name: roleName,
      description: roleName,
      isSystem: true,
    });

    // eslint-disable-next-line no-await-in-loop
    const granted = await db.select().from(permissions).where(inArray(permissions.name, permissionNames));
    // eslint-disable-next-line no-await-in-loop
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
    if (granted.length) {
      // eslint-disable-next-line no-await-in-loop
      await db
        .insert(rolePermissions)
        .values(granted.map((p) => ({ roleId: role.id, permissionId: p.id })))
        .onConflictDoNothing();
    }
  }

  return { superAdmin };
}

async function seedAdminUser(superAdminRole) {
  console.log('Seeding development admin user...');
  const email = 'admin@example.com';
  const passwordHash = await bcryptHasher.hash('Admin@12345');
  const agencyId = '00000000-0000-0000-0000-000000000001';

  const { row: agency } = await findOrCreate(agencies, eq(agencies.id, agencyId), {
    id: agencyId,
    name: 'Global Travel Agency',
    email: 'contact@globaltravel.example',
    phone: '+880-1000-000000',
    currency: 'USD',
    timezone: 'Asia/Dhaka',
  });

  const { row: admin } = await findOrCreate(users, eq(users.email, email), {
    agencyId: agency.id,
    firstName: 'System',
    lastName: 'Administrator',
    email,
    passwordHash,
    isEmailVerified: true,
    status: 'active',
  });

  await db.insert(userRoles).values({ userId: admin.id, roleId: superAdminRole.id }).onConflictDoNothing();

  return { agency, admin };
}

async function seedAmenities() {
  const names = ['WiFi', 'Parking', 'Swimming Pool', 'Gym', 'Restaurant', 'Air Conditioning', 'Breakfast', 'Airport Transfer', 'Room Service', 'Spa'];
  const amenities = {};
  for (const name of names) {
    // eslint-disable-next-line no-await-in-loop -- a short, fixed list
    const { row } = await findOrCreate(amenitiesTable, eq(amenitiesTable.name, name), { name });
    amenities[name] = row;
  }
  return amenities;
}

async function seedServices() {
  // Extra services (instructions.md section 20) attachable to a booking during checkout.
  const services = [
    { name: 'Airport Pickup', description: 'One-way transfer from the airport to the hotel.', price: '25.00', tax: '0' },
    { name: 'Airport Drop', description: 'One-way transfer from the hotel to the airport.', price: '25.00', tax: '0' },
    { name: 'Breakfast', description: 'Daily breakfast for the length of stay (per room).', price: '15.00', tax: '0' },
    { name: 'Extra Bed', description: 'An additional bed placed in the room.', price: '20.00', tax: '0' },
    { name: 'Laundry', description: 'Same-day laundry service.', price: '10.00', tax: '0' },
    { name: 'Room Service', description: '24-hour in-room dining.', price: '5.00', tax: '0' },
    { name: 'Transportation', description: 'Local transportation, per trip.', price: '30.00', tax: '0' },
    { name: 'Guided Tour', description: 'A half-day guided city tour.', price: '40.00', tax: '0' },
  ];
  for (const svc of services) {
    // eslint-disable-next-line no-await-in-loop -- a short, fixed list
    await findOrCreate(servicesTable, eq(servicesTable.name, svc.name), svc);
  }
}

async function seedRatePlans() {
  const plans = [
    { name: 'Room Only', type: 'room_only' },
    { name: 'Breakfast Included', type: 'breakfast_included' },
    { name: 'Half Board', type: 'half_board' },
    { name: 'Full Board', type: 'full_board' },
    { name: 'All Inclusive', type: 'all_inclusive' },
  ];
  const created = {};
  for (const plan of plans) {
    // eslint-disable-next-line no-await-in-loop -- a short, fixed list
    const { row } = await findOrCreate(ratePlansTable, eq(ratePlansTable.name, plan.name), plan);
    created[plan.name] = row;
  }
  return created;
}

async function seedHotels(agency, amenities, ratePlans) {
  console.log('Seeding hotels, room types, rooms and rates...');
  const hotelDefs = [
    { name: 'Grand Palace Hotel', city: 'Dhaka', country: 'Bangladesh', starRating: 5 },
    { name: 'Ocean View Resort', city: "Cox's Bazar", country: 'Bangladesh', starRating: 4 },
    { name: 'City Center Hotel', city: 'Chittagong', country: 'Bangladesh', starRating: 3 },
  ];

  const roomTypeDefs = [
    { name: 'Standard', maxAdults: 2, maxChildren: 1, basePrice: 60 },
    { name: 'Deluxe', maxAdults: 2, maxChildren: 2, basePrice: 100 },
    { name: 'Suite', maxAdults: 4, maxChildren: 2, basePrice: 180 },
  ];

  const today = new Date();
  const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(today.getUTCFullYear() + 2, 0, 1));

  /* eslint-disable no-await-in-loop -- the seed is deliberately sequential */
  for (const hotelDef of hotelDefs) {
    const { row: hotel, created } = await findOrCreate(hotels, eq(hotels.name, hotelDef.name), {
      agencyId: agency.id,
      name: hotelDef.name,
      description: `${hotelDef.name} is a well-known property in ${hotelDef.city}.`,
      address: `1 Main Road, ${hotelDef.city}`,
      city: hotelDef.city,
      country: hotelDef.country,
      starRating: hotelDef.starRating,
      email: `info@${hotelDef.name.toLowerCase().replace(/\s+/g, '')}.example`,
      phone: '+880-2-000000',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      cancellationPolicy: 'Free cancellation up to 7 days before check-in; 50% charge inside 7 days; 100% inside 24 hours.',
      status: 'active',
    });

    if (created) {
      await db
        .insert(hotelAmenities)
        .values(
          Object.values(amenities)
            .slice(0, 6)
            .map((a) => ({ hotelId: hotel.id, amenityId: a.id }))
        )
        .onConflictDoNothing();
    }

    for (const rt of roomTypeDefs) {
      const { row: roomType, created: roomTypeCreated } = await findOrCreate(
        roomTypes,
        and(eq(roomTypes.hotelId, hotel.id), eq(roomTypes.name, rt.name)),
        {
          hotelId: hotel.id,
          name: rt.name,
          description: `${rt.name} room with modern amenities.`,
          maxAdults: rt.maxAdults,
          maxChildren: rt.maxChildren,
          bedType: 'Queen',
          totalRooms: 5,
        }
      );

      if (roomTypeCreated) {
        await db.insert(rooms).values(
          Array.from({ length: 5 }, (_, i) => ({
            roomTypeId: roomType.id,
            roomNumber: `${rt.name[0]}${100 + i}`,
            floor: String(Math.ceil((i + 1) / 2)),
            status: 'available',
          }))
        );

        await db.insert(roomRates).values([
          {
            roomTypeId: roomType.id,
            ratePlanId: ratePlans['Room Only'].id,
            startDate,
            endDate,
            price: String(rt.basePrice),
            extraAdultPrice: '15',
            extraChildPrice: '8',
            currency: 'USD',
            priority: 1,
          },
          {
            roomTypeId: roomType.id,
            ratePlanId: ratePlans['Breakfast Included'].id,
            startDate,
            endDate,
            price: String(rt.basePrice + 20),
            extraAdultPrice: '20',
            extraChildPrice: '10',
            currency: 'USD',
            priority: 1,
          },
        ]);
      }
    }
  }
  /* eslint-enable no-await-in-loop */
}

async function seedDestinationsAndTours() {
  console.log('Seeding destinations and tour packages...');
  const destinationDefs = [
    { name: 'Dhaka', country: 'Bangladesh' },
    { name: "Cox's Bazar", country: 'Bangladesh' },
    { name: 'Chittagong', country: 'Bangladesh' },
    { name: 'Sylhet', country: 'Bangladesh' },
    { name: 'Sajek', country: 'Bangladesh' },
  ];

  /* eslint-disable no-await-in-loop -- the seed is deliberately sequential */
  const created = {};
  for (const d of destinationDefs) {
    const { row } = await findOrCreate(destinations, eq(destinations.name, d.name), d);
    created[d.name] = row;
  }

  const tourDefs = [
    { name: "Cox's Bazar 3 Days", destination: "Cox's Bazar", durationDays: 3, price: 250, maxParticipants: 20 },
    { name: 'Sylhet 2 Days', destination: 'Sylhet', durationDays: 2, price: 180, maxParticipants: 20 },
    { name: 'Sajek 3 Days', destination: 'Sajek', durationDays: 3, price: 220, maxParticipants: 15 },
  ];

  for (const t of tourDefs) {
    const destination = created[t.destination];
    const { row: tourPackage, created: tourCreated } = await findOrCreate(
      tourPackages,
      eq(tourPackages.name, t.name),
      {
        destinationId: destination.id,
        name: t.name,
        description: `Explore ${t.destination} over ${t.durationDays} unforgettable days.`,
        durationDays: t.durationDays,
        price: String(t.price),
        maxParticipants: t.maxParticipants,
        includedServices: 'Hotel, transport, breakfast',
        excludedServices: 'Personal expenses',
        status: 'active',
      }
    );

    if (tourCreated) {
      await db.insert(tourItineraries).values(
        Array.from({ length: t.durationDays }, (_, i) => ({
          tourPackageId: tourPackage.id,
          dayNumber: i + 1,
          title: `Day ${i + 1}`,
          description: i === 0 ? `Arrival in ${t.destination} and hotel check-in` : `Sightseeing in ${t.destination}`,
          meals: 'Breakfast',
          accommodation: `${t.destination} hotel`,
          transportation: 'Private vehicle',
        }))
      );
    }
  }
  /* eslint-enable no-await-in-loop */
}

async function seedSampleCustomer(agency) {
  console.log('Seeding a sample customer...');
  const email = 'customer@example.com';

  const existing = await userRepository.findByEmail(email);
  if (existing) return existing;

  const passwordHash = await bcryptHasher.hash('Customer@12345');
  const [customerRole] = await db.select().from(roles).where(eq(roles.name, ROLES.CUSTOMER)).limit(1);

  // The user, their role and their customer profile in one transaction --
  // the same path self-registration takes.
  return userRepository.createCustomerAccount(
    {
      firstName: 'Jane',
      lastName: 'Doe',
      email,
      passwordHash,
      isEmailVerified: true,
      status: 'active',
      agencyId: agency.id,
    },
    {
      roleId: customerRole?.id,
      customer: { firstName: 'Jane', lastName: 'Doe', email, nationality: 'Bangladeshi' },
    }
  );
}

async function main() {
  const { superAdmin } = await seedPermissionsAndRoles();
  const { agency } = await seedAdminUser(superAdmin);
  const amenities = await seedAmenities();
  const ratePlans = await seedRatePlans();
  await seedHotels(agency, amenities, ratePlans);
  await seedServices();
  await seedDestinationsAndTours();
  await seedSampleCustomer(agency);

  console.log('\nSeed complete.');
  console.log('DEVELOPMENT ONLY credentials:');
  console.log('  Admin    -> admin@example.com / Admin@12345');
  console.log('  Customer -> customer@example.com / Customer@12345');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
