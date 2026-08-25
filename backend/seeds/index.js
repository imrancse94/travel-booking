import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { BcryptHasher } from '../src/lib/BcryptHasher.js';
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from '../src/config/permissions.js';

const prisma = new PrismaClient();
const bcryptHasher = new BcryptHasher();

async function seedPermissionsAndRoles() {
  console.log('Seeding permissions...');
  for (const name of PERMISSIONS) {
    const [module] = name.split('.');
    await prisma.permission.upsert({ where: { name }, update: {}, create: { name, module } });
  }

  console.log('Seeding roles...');
  const superAdmin = await prisma.role.upsert({
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

  return { superAdmin };
}

async function seedAdminUser(superAdminRole) {
  console.log('Seeding development admin user...');
  const email = 'admin@example.com';
  const passwordHash = await bcryptHasher.hash('Admin@12345');

  const agency = await prisma.agency.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Global Travel Agency',
      email: 'contact@globaltravel.example',
      phone: '+880-1000-000000',
      currency: 'USD',
      timezone: 'Asia/Dhaka',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      agencyId: agency.id,
      firstName: 'System',
      lastName: 'Administrator',
      email,
      passwordHash,
      isEmailVerified: true,
      status: 'active',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });

  return { agency, admin };
}

async function seedAmenities() {
  const names = ['WiFi', 'Parking', 'Swimming Pool', 'Gym', 'Restaurant', 'Air Conditioning', 'Breakfast', 'Airport Transfer', 'Room Service', 'Spa'];
  const amenities = {};
  for (const name of names) {
    amenities[name] = await prisma.amenity.upsert({ where: { name }, update: {}, create: { name } });
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
    const existing = await prisma.service.findFirst({ where: { name: svc.name } });
    if (!existing) await prisma.service.create({ data: svc });
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
    const existing = await prisma.ratePlan.findFirst({ where: { name: plan.name } });
    created[plan.name] = existing || (await prisma.ratePlan.create({ data: plan }));
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

  for (const hotelDef of hotelDefs) {
    const existing = await prisma.hotel.findFirst({ where: { name: hotelDef.name } });
    const hotel =
      existing ||
      (await prisma.hotel.create({
        data: {
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
        },
      }));

    if (!existing) {
      await prisma.hotelAmenity.createMany({
        data: Object.values(amenities)
          .slice(0, 6)
          .map((a) => ({ hotelId: hotel.id, amenityId: a.id })),
        skipDuplicates: true,
      });
    }

    for (const rt of roomTypeDefs) {
      const existingRt = await prisma.roomType.findFirst({ where: { hotelId: hotel.id, name: rt.name } });
      const roomType =
        existingRt ||
        (await prisma.roomType.create({
          data: {
            hotelId: hotel.id,
            name: rt.name,
            description: `${rt.name} room with modern amenities.`,
            maxAdults: rt.maxAdults,
            maxChildren: rt.maxChildren,
            bedType: 'Queen',
            totalRooms: 5,
          },
        }));

      if (!existingRt) {
        await prisma.room.createMany({
          data: Array.from({ length: 5 }, (_, i) => ({
            roomTypeId: roomType.id,
            roomNumber: `${rt.name[0]}${100 + i}`,
            floor: String(Math.ceil((i + 1) / 2)),
            status: 'available',
          })),
        });

        await prisma.roomRate.create({
          data: {
            roomTypeId: roomType.id,
            ratePlanId: ratePlans['Room Only'].id,
            startDate,
            endDate,
            price: rt.basePrice,
            extraAdultPrice: 15,
            extraChildPrice: 8,
            currency: 'USD',
            priority: 1,
          },
        });
        await prisma.roomRate.create({
          data: {
            roomTypeId: roomType.id,
            ratePlanId: ratePlans['Breakfast Included'].id,
            startDate,
            endDate,
            price: rt.basePrice + 20,
            extraAdultPrice: 20,
            extraChildPrice: 10,
            currency: 'USD',
            priority: 1,
          },
        });
      }
    }
  }
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
  const destinations = {};
  for (const d of destinationDefs) {
    const existing = await prisma.destination.findFirst({ where: { name: d.name } });
    destinations[d.name] = existing || (await prisma.destination.create({ data: d }));
  }

  const tourDefs = [
    { name: "Cox's Bazar 3 Days", destination: "Cox's Bazar", durationDays: 3, price: 250, maxParticipants: 20 },
    { name: 'Sylhet 2 Days', destination: 'Sylhet', durationDays: 2, price: 180, maxParticipants: 20 },
    { name: 'Sajek 3 Days', destination: 'Sajek', durationDays: 3, price: 220, maxParticipants: 15 },
  ];

  for (const t of tourDefs) {
    const destination = destinations[t.destination];
    const existing = await prisma.tourPackage.findFirst({ where: { name: t.name } });
    const tourPackage =
      existing ||
      (await prisma.tourPackage.create({
        data: {
          destinationId: destination.id,
          name: t.name,
          description: `Explore ${t.destination} over ${t.durationDays} unforgettable days.`,
          durationDays: t.durationDays,
          price: t.price,
          maxParticipants: t.maxParticipants,
          includedServices: 'Hotel, transport, breakfast',
          excludedServices: 'Personal expenses',
          status: 'active',
        },
      }));

    if (!existing) {
      await prisma.tourItinerary.createMany({
        data: Array.from({ length: t.durationDays }, (_, i) => ({
          tourPackageId: tourPackage.id,
          dayNumber: i + 1,
          title: `Day ${i + 1}`,
          description: i === 0 ? `Arrival in ${t.destination} and hotel check-in` : `Sightseeing in ${t.destination}`,
          meals: 'Breakfast',
          accommodation: `${t.destination} hotel`,
          transportation: 'Private vehicle',
        })),
      });
    }
  }
}

async function seedSampleCustomerAndBooking(agency) {
  console.log('Seeding a sample customer...');
  const email = 'customer@example.com';
  const passwordHash = await bcryptHasher.hash('Customer@12345');

  const customerRole = await prisma.role.findUnique({ where: { name: ROLES.CUSTOMER } });
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      firstName: 'Jane',
      lastName: 'Doe',
      email,
      passwordHash,
      isEmailVerified: true,
      status: 'active',
      agencyId: agency.id,
      userRoles: customerRole ? { create: { roleId: customerRole.id } } : undefined,
      customer: { create: { firstName: 'Jane', lastName: 'Doe', email, nationality: 'Bangladeshi' } },
    },
  });
  return user;
}

async function main() {
  const { superAdmin } = await seedPermissionsAndRoles();
  const { agency } = await seedAdminUser(superAdmin);
  const amenities = await seedAmenities();
  const ratePlans = await seedRatePlans();
  await seedHotels(agency, amenities, ratePlans);
  await seedServices();
  await seedDestinationsAndTours();
  await seedSampleCustomerAndBooking(agency);

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
    await prisma.$disconnect();
  });
