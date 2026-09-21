import { z } from 'zod';

export const createDestinationSchema = z.object({
  name: z.string().min(1),
  country: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateDestinationSchema = z.object({
  name: z.string().min(1).optional(),
  country: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const listDestinationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
