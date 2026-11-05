import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  tax: z.number().min(0).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const listServicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
