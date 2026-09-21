import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  roleIds: z.array(z.string().uuid()).default([]),
  agencyId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
