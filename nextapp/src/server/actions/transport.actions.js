'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import {
  createVehicleSchema,
  updateVehicleSchema,
  createDriverSchema,
  updateDriverSchema,
  createTransportBookingSchema,
  updateTransportBookingSchema,
} from '../validators/transport.validators.js';
import * as transportService from '../services/transportService.js';

// ---- Vehicles ----

export async function saveVehicleAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'transport.update' : 'transport.create');
    return id
      ? transportService.updateVehicle(id, parse('body', payload, updateVehicleSchema), user.id)
      : transportService.createVehicle(parse('body', payload, createVehicleSchema), user.id);
  });
}

export async function deleteVehicleAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'transport.delete');
    await transportService.deleteVehicle(id, user.id);
    return null;
  });
}

// ---- Drivers ----

export async function saveDriverAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'transport.update' : 'transport.create');
    return id
      ? transportService.updateDriver(id, parse('body', payload, updateDriverSchema), user.id)
      : transportService.createDriver(parse('body', payload, createDriverSchema), user.id);
  });
}

export async function deleteDriverAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'transport.delete');
    await transportService.deleteDriver(id, user.id);
    return null;
  });
}

// ---- Transport bookings ----

export async function saveTransportBookingAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'transport.update' : 'transport.create');
    return id
      ? transportService.updateBooking(id, parse('body', payload, updateTransportBookingSchema), user.id)
      : transportService.createBooking(parse('body', payload, createTransportBookingSchema), user.id);
  });
}

export async function cancelTransportBookingAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'transport.delete');
    return transportService.cancelBooking(id, user.id);
  });
}
