import { and, count, desc, eq, gte, ilike, isNull, lte, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { drivers, transportBookings, vehicles } from '../db/schema.js';

// ==================================================
// Vehicles
// ==================================================

const vehicleNotDeleted = isNull(vehicles.deletedAt);

export async function findVehicleById(id) {
  const row = await db.query.vehicles.findFirst({
    where: and(eq(vehicles.id, id), vehicleNotDeleted),
    with: { drivers: { columns: { id: true, name: true } } },
  });
  return row ?? null;
}

export async function listVehicles({ limit, skip, search, type, status }) {
  const filters = [
    vehicleNotDeleted,
    type ? eq(vehicles.type, type) : null,
    status ? eq(vehicles.status, status) : null,
    search ? ilike(vehicles.registrationNumber, `%${search}%`) : null,
  ].filter(Boolean);
  const where = and(...filters);

  const [items, [{ value: total }]] = await Promise.all([
    db.select().from(vehicles).where(where).orderBy(desc(vehicles.createdAt)).limit(limit).offset(skip),
    db.select({ value: count() }).from(vehicles).where(where),
  ]);

  return { items, total };
}

export async function createVehicle(data) {
  const [row] = await db.insert(vehicles).values(data).returning();
  return row;
}

export async function updateVehicle(id, data) {
  const [row] = await db.update(vehicles).set(data).where(eq(vehicles.id, id)).returning();
  return row ?? null;
}

export async function softDeleteVehicle(id) {
  const [row] = await db
    .update(vehicles)
    .set({ deletedAt: new Date(), status: 'inactive' })
    .where(eq(vehicles.id, id))
    .returning();
  return row ?? null;
}

// ==================================================
// Drivers
// ==================================================

export async function findDriverById(id) {
  const row = await db.query.drivers.findFirst({
    where: eq(drivers.id, id),
    with: { vehicle: { columns: { id: true, registrationNumber: true, type: true } } },
  });
  return row ?? null;
}

export async function listDrivers({ limit, skip, search, status, vehicleId }) {
  const filters = [
    status ? eq(drivers.status, status) : null,
    vehicleId ? eq(drivers.vehicleId, vehicleId) : null,
    search
      ? or(
          ilike(drivers.name, `%${search}%`),
          ilike(drivers.phone, `%${search}%`),
          ilike(drivers.licenseNumber, `%${search}%`)
        )
      : null,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.select().from(drivers).where(where).orderBy(desc(drivers.createdAt)).limit(limit).offset(skip),
    db.select({ value: count() }).from(drivers).where(where),
  ]);

  return { items, total };
}

export async function createDriver(data) {
  const [row] = await db.insert(drivers).values(data).returning();
  return row;
}

export async function updateDriver(id, data) {
  const [row] = await db.update(drivers).set(data).where(eq(drivers.id, id)).returning();
  return row ?? null;
}

// Driver has no deletedAt column, so "delete" disables the driver by flipping
// status to inactive rather than removing a row transport bookings may reference.
export async function disableDriver(id) {
  const [row] = await db.update(drivers).set({ status: 'inactive' }).where(eq(drivers.id, id)).returning();
  return row ?? null;
}

// ==================================================
// Transport bookings
// ==================================================

const bookingRelations = {
  vehicle: { columns: { id: true, type: true, registrationNumber: true, capacity: true } },
  driver: { columns: { id: true, name: true, phone: true } },
};

export async function findBookingById(id) {
  const row = await db.query.transportBookings.findFirst({
    where: eq(transportBookings.id, id),
    with: bookingRelations,
  });
  return row ?? null;
}

export async function listBookings({ limit, skip, search, status, vehicleId, driverId, dateFrom, dateTo }) {
  const filters = [
    status ? eq(transportBookings.status, status) : null,
    vehicleId ? eq(transportBookings.vehicleId, vehicleId) : null,
    driverId ? eq(transportBookings.driverId, driverId) : null,
    dateFrom ? gte(transportBookings.date, new Date(dateFrom)) : null,
    dateTo ? lte(transportBookings.date, new Date(dateTo)) : null,
    search
      ? or(ilike(transportBookings.pickup, `%${search}%`), ilike(transportBookings.dropoff, `%${search}%`))
      : null,
  ].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;

  const [items, [{ value: total }]] = await Promise.all([
    db.query.transportBookings.findMany({
      where,
      with: bookingRelations,
      orderBy: desc(transportBookings.createdAt),
      limit,
      offset: skip,
    }),
    db.select({ value: count() }).from(transportBookings).where(where),
  ]);

  return { items, total };
}

export async function createBooking(data) {
  const [created] = await db.insert(transportBookings).values(data).returning();
  return findBookingById(created.id);
}

export async function updateBooking(id, data) {
  const [updated] = await db.update(transportBookings).set(data).where(eq(transportBookings.id, id)).returning();
  return updated ? findBookingById(updated.id) : null;
}

// TransportBooking has no deletedAt column either; "delete" cancels the
// booking so the history/audit trail is preserved.
export async function cancelBooking(id) {
  const [updated] = await db
    .update(transportBookings)
    .set({ status: 'cancelled' })
    .where(eq(transportBookings.id, id))
    .returning();
  return updated ? findBookingById(updated.id) : null;
}
