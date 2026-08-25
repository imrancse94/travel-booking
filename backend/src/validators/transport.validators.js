import { z } from 'zod';

const vehicleTypeEnum = z.enum(['car', 'microbus', 'bus', 'van', 'minibus']);
const vehicleStatusEnum = z.enum(['available', 'in_use', 'maintenance', 'inactive']);
const driverStatusEnum = z.enum(['active', 'inactive']);
const transportBookingStatusEnum = z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']);

// ---- Vehicles ----

export const createVehicleSchema = z.object({
  type: vehicleTypeEnum,
  registrationNumber: z.string().min(1),
  capacity: z.number().int().min(1),
  status: vehicleStatusEnum.optional(),
});

export const updateVehicleSchema = z.object({
  type: vehicleTypeEnum.optional(),
  registrationNumber: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  status: vehicleStatusEnum.optional(),
});

export const listVehiclesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  type: vehicleTypeEnum.optional(),
  status: vehicleStatusEnum.optional(),
});

// ---- Drivers ----

export const createDriverSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
  vehicleId: z.string().uuid().optional(),
  status: driverStatusEnum.optional(),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
  vehicleId: z.string().uuid().nullable().optional(),
  status: driverStatusEnum.optional(),
});

export const listDriversQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: driverStatusEnum.optional(),
  vehicleId: z.string().uuid().optional(),
});

// ---- Transport bookings ----

export const createTransportBookingSchema = z.object({
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid().optional(),
  pickup: z.string().min(1),
  dropoff: z.string().min(1),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
  time: z.string().min(1),
  price: z.number().min(0),
  status: transportBookingStatusEnum.optional(),
});

export const updateTransportBookingSchema = z.object({
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().nullable().optional(),
  pickup: z.string().min(1).optional(),
  dropoff: z.string().min(1).optional(),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date').optional(),
  time: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  status: transportBookingStatusEnum.optional(),
});

export const listTransportBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: transportBookingStatusEnum.optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
