import { z } from 'zod';

export const createRoomTypeSchema = z.object({
  hotelId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  maxAdults: z.number().int().min(1).optional(),
  maxChildren: z.number().int().min(0).optional(),
  bedType: z.string().optional(),
  roomSize: z.number().positive().optional(),
  smoking: z.boolean().optional(),
  totalRooms: z.number().int().min(0).optional(),
});

export const updateRoomTypeSchema = createRoomTypeSchema.partial().omit({ hotelId: true });

export const listRoomTypesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  hotelId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export const roomTypeImageIdParamSchema = z.object({
  id: z.string().uuid(),
  imageId: z.string().uuid(),
});

export const roomTypeAmenityIdParamSchema = z.object({
  id: z.string().uuid(),
  amenityId: z.string().uuid(),
});

export const addRoomTypeImageSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const setAmenitiesSchema = z.object({
  amenityIds: z.array(z.string().uuid()),
});

export const assignAmenitySchema = z.object({
  amenityId: z.string().uuid(),
});

export const listRatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
