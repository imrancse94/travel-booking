import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import * as transportService from '../services/transportService.js';

// ---- Vehicles ----

export const listVehicles = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await transportService.listVehicles({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await transportService.getVehicle(req.params.id);
  return success(res, { data: vehicle });
});

export const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await transportService.createVehicle(req.body, req.user.id);
  return created(res, vehicle, 'Vehicle created');
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await transportService.updateVehicle(req.params.id, req.body, req.user.id);
  return success(res, { data: vehicle, message: 'Vehicle updated' });
});

export const removeVehicle = asyncHandler(async (req, res) => {
  await transportService.deleteVehicle(req.params.id, req.user.id);
  return success(res, { message: 'Vehicle deleted' });
});

// ---- Drivers ----

export const listDrivers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await transportService.listDrivers({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getDriver = asyncHandler(async (req, res) => {
  const driver = await transportService.getDriver(req.params.id);
  return success(res, { data: driver });
});

export const createDriver = asyncHandler(async (req, res) => {
  const driver = await transportService.createDriver(req.body, req.user.id);
  return created(res, driver, 'Driver created');
});

export const updateDriver = asyncHandler(async (req, res) => {
  const driver = await transportService.updateDriver(req.params.id, req.body, req.user.id);
  return success(res, { data: driver, message: 'Driver updated' });
});

export const removeDriver = asyncHandler(async (req, res) => {
  await transportService.deleteDriver(req.params.id, req.user.id);
  return success(res, { message: 'Driver deactivated' });
});

// ---- Transport bookings ----

export const listBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await transportService.listBookings({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getBooking = asyncHandler(async (req, res) => {
  const booking = await transportService.getBooking(req.params.id);
  return success(res, { data: booking });
});

export const createBooking = asyncHandler(async (req, res) => {
  const booking = await transportService.createBooking(req.body, req.user.id);
  return created(res, booking, 'Transport booking created');
});

export const updateBooking = asyncHandler(async (req, res) => {
  const booking = await transportService.updateBooking(req.params.id, req.body, req.user.id);
  return success(res, { data: booking, message: 'Transport booking updated' });
});

export const removeBooking = asyncHandler(async (req, res) => {
  const booking = await transportService.cancelBooking(req.params.id, req.user.id);
  return success(res, { data: booking, message: 'Transport booking cancelled' });
});
