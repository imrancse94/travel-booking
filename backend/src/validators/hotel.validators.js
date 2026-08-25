import { z } from 'zod';

export const createHotelSchema = z.object({
  agencyId: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  starRating: z.number().int().min(1).max(5).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  paymentPolicy: z.string().optional(),
  childPolicy: z.string().optional(),
  petPolicy: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

export const updateHotelSchema = createHotelSchema.partial();

export const listHotelsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  starRating: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export const hotelImageIdParamSchema = z.object({
  id: z.string().uuid(),
  imageId: z.string().uuid(),
});

export const hotelAmenityIdParamSchema = z.object({
  id: z.string().uuid(),
  amenityId: z.string().uuid(),
});

export const addHotelImageSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const assignAmenitySchema = z.object({
  amenityId: z.string().uuid(),
});

export const setAmenitiesSchema = z.object({
  amenityIds: z.array(z.string().uuid()),
});
