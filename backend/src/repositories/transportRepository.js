import { prisma } from '../config/prisma.js';

// ==================================================
// Vehicles
// ==================================================

export async function findVehicleById(id) {
  return prisma.vehicle.findFirst({ where: { id, deletedAt: null }, include: { drivers: { select: { id: true, name: true } } } });
}

export async function listVehicles({ page, limit, skip, search, type, status }) {
  const where = {
    deletedAt: null,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(search ? { registrationNumber: { contains: search, mode: 'insensitive' } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.vehicle.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.vehicle.count({ where }),
  ]);

  return { items, total };
}

export async function createVehicle(data) {
  return prisma.vehicle.create({ data });
}

export async function updateVehicle(id, data) {
  return prisma.vehicle.update({ where: { id }, data });
}

export async function softDeleteVehicle(id) {
  return prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date(), status: 'inactive' } });
}

// ==================================================
// Drivers
// ==================================================

export async function findDriverById(id) {
  return prisma.driver.findUnique({ where: { id }, include: { vehicle: { select: { id: true, registrationNumber: true, type: true } } } });
}

export async function listDrivers({ page, limit, skip, search, status, vehicleId }) {
  const where = {
    ...(status ? { status } : {}),
    ...(vehicleId ? { vehicleId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { licenseNumber: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.driver.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.driver.count({ where }),
  ]);

  return { items, total };
}

export async function createDriver(data) {
  return prisma.driver.create({ data });
}

export async function updateDriver(id, data) {
  return prisma.driver.update({ where: { id }, data });
}

// Driver has no deletedAt column in the schema, so "delete" disables the
// driver by flipping status to inactive rather than removing the row (which
// would also fail if the driver is still referenced by transport bookings).
export async function disableDriver(id) {
  return prisma.driver.update({ where: { id }, data: { status: 'inactive' } });
}

// ==================================================
// Transport bookings
// ==================================================

const bookingInclude = {
  vehicle: { select: { id: true, type: true, registrationNumber: true, capacity: true } },
  driver: { select: { id: true, name: true, phone: true } },
};

export async function findBookingById(id) {
  return prisma.transportBooking.findUnique({ where: { id }, include: bookingInclude });
}

export async function listBookings({ page, limit, skip, search, status, vehicleId, driverId, dateFrom, dateTo }) {
  const where = {
    ...(status ? { status } : {}),
    ...(vehicleId ? { vehicleId } : {}),
    ...(driverId ? { driverId } : {}),
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { pickup: { contains: search, mode: 'insensitive' } },
            { dropoff: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.transportBooking.findMany({ where, include: bookingInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.transportBooking.count({ where }),
  ]);

  return { items, total };
}

export async function createBooking(data) {
  return prisma.transportBooking.create({ data, include: bookingInclude });
}

export async function updateBooking(id, data) {
  return prisma.transportBooking.update({ where: { id }, data, include: bookingInclude });
}

// TransportBooking has no deletedAt column either; "delete" cancels the
// booking so history/audit trail is preserved.
export async function cancelBooking(id) {
  return prisma.transportBooking.update({ where: { id }, data: { status: 'cancelled' }, include: bookingInclude });
}
