import { z } from 'zod';

export const createAmenitySchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  category: z.string().optional(),
});

export const updateAmenitySchema = createAmenitySchema.partial();

export const listAmenitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  category: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
