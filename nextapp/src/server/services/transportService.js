import { ConflictError, NotFoundError } from '../utils/errors.js';
import { roundCurrency } from '../utils/money.js';
import * as transportRepository from '../repositories/transportRepository.js';
import { recordAudit } from './auditService.js';

// ==================================================
// Vehicles
// ==================================================

export async function listVehicles(query) {
  const { items, total } = await transportRepository.listVehicles(query);
  return { items, total };
}

export async function getVehicle(id) {
  const vehicle = await transportRepository.findVehicleById(id);
  if (!vehicle) throw new NotFoundError('Vehicle not found');
  return vehicle;
}

export async function createVehicle(data, actorId) {
  const existing = await transportRepository.findVehicleByRegistration(data.registrationNumber);
  if (existing) throw new ConflictError('A vehicle with this registration number already exists');

  const vehicle = await transportRepository.createVehicle(data);
  await recordAudit({ userId: actorId, action: 'vehicle.created', entity: 'Vehicle', entityId: vehicle.id, newValue: data });
  return vehicle;
}

export async function updateVehicle(id, data, actorId) {
  const existing = await transportRepository.findVehicleById(id);
  if (!existing) throw new NotFoundError('Vehicle not found');

  const updated = await transportRepository.updateVehicle(id, data);
  await recordAudit({ userId: actorId, action: 'vehicle.updated', entity: 'Vehicle', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function deleteVehicle(id, actorId) {
  const existing = await transportRepository.findVehicleById(id);
  if (!existing) throw new NotFoundError('Vehicle not found');

  await transportRepository.softDeleteVehicle(id);
  await recordAudit({ userId: actorId, action: 'vehicle.deleted', entity: 'Vehicle', entityId: id });
}

// ==================================================
// Drivers
// ==================================================

export async function listDrivers(query) {
  const { items, total } = await transportRepository.listDrivers(query);
  return { items, total };
}

export async function getDriver(id) {
  const driver = await transportRepository.findDriverById(id);
  if (!driver) throw new NotFoundError('Driver not found');
  return driver;
}

export async function createDriver(data, actorId) {
  if (data.vehicleId) {
    const vehicle = await transportRepository.findVehicleById(data.vehicleId);
    if (!vehicle) throw new NotFoundError('Vehicle not found');
  }

  const driver = await transportRepository.createDriver(data);
  await recordAudit({ userId: actorId, action: 'driver.created', entity: 'Driver', entityId: driver.id, newValue: data });
  return driver;
}

export async function updateDriver(id, data, actorId) {
  const existing = await transportRepository.findDriverById(id);
  if (!existing) throw new NotFoundError('Driver not found');

  if (data.vehicleId) {
    const vehicle = await transportRepository.findVehicleById(data.vehicleId);
    if (!vehicle) throw new NotFoundError('Vehicle not found');
  }

  const updated = await transportRepository.updateDriver(id, data);
  await recordAudit({ userId: actorId, action: 'driver.updated', entity: 'Driver', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function deleteDriver(id, actorId) {
  const existing = await transportRepository.findDriverById(id);
  if (!existing) throw new NotFoundError('Driver not found');

  await transportRepository.disableDriver(id);
  await recordAudit({ userId: actorId, action: 'driver.deleted', entity: 'Driver', entityId: id });
}

// ==================================================
// Transport bookings
// ==================================================

export async function listBookings(query) {
  const { items, total } = await transportRepository.listBookings(query);
  return { items, total };
}

export async function getBooking(id) {
  const booking = await transportRepository.findBookingById(id);
  if (!booking) throw new NotFoundError('Transport booking not found');
  return booking;
}

async function assertVehicleAndDriverBookable({ vehicleId, driverId }) {
  const vehicle = await transportRepository.findVehicleById(vehicleId);
  if (!vehicle) throw new NotFoundError('Vehicle not found');
  if (['maintenance', 'inactive'].includes(vehicle.status)) {
    throw new ConflictError(`Vehicle ${vehicle.registrationNumber} is not currently bookable (${vehicle.status})`);
  }

  if (driverId) {
    const driver = await transportRepository.findDriverById(driverId);
    if (!driver) throw new NotFoundError('Driver not found');
    if (driver.status !== 'active') {
      throw new ConflictError(`Driver ${driver.name} is not currently active`);
    }
  }
}

// There is no transport rate table in the schema, so price is an admin-set
// value rather than something recalculated from a catalog -- but it is still
// funnelled through Money/roundCurrency instead of being trusted as a raw float.
export async function createBooking(data, actorId) {
  await assertVehicleAndDriverBookable(data);

  const booking = await transportRepository.createBooking({
    ...data,
    price: roundCurrency(data.price).toString(),
    status: data.status || 'pending',
  });

  await recordAudit({ userId: actorId, action: 'transport_booking.created', entity: 'TransportBooking', entityId: booking.id, newValue: data });
  return booking;
}

export async function updateBooking(id, data, actorId) {
  const existing = await transportRepository.findBookingById(id);
  if (!existing) throw new NotFoundError('Transport booking not found');
  if (['completed', 'cancelled'].includes(existing.status)) {
    throw new ConflictError(`Transport booking is already ${existing.status} and cannot be modified`);
  }

  if (data.vehicleId || data.driverId) {
    await assertVehicleAndDriverBookable({
      vehicleId: data.vehicleId || existing.vehicleId,
      driverId: data.driverId !== undefined ? data.driverId : existing.driverId,
    });
  }

  const payload = { ...data };
  if (payload.price !== undefined) {
    payload.price = roundCurrency(payload.price).toString();
  }

  const updated = await transportRepository.updateBooking(id, payload);
  await recordAudit({ userId: actorId, action: 'transport_booking.updated', entity: 'TransportBooking', entityId: id, oldValue: existing, newValue: data });
  return updated;
}

export async function cancelBooking(id, actorId) {
  const existing = await transportRepository.findBookingById(id);
  if (!existing) throw new NotFoundError('Transport booking not found');
  if (['completed', 'cancelled'].includes(existing.status)) {
    throw new ConflictError(`Transport booking is already ${existing.status}`);
  }

  const cancelled = await transportRepository.cancelBooking(id);
  await recordAudit({ userId: actorId, action: 'transport_booking.cancelled', entity: 'TransportBooking', entityId: id });
  return cancelled;
}
