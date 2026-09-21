import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissionIds: z.array(z.string().uuid()).default([]),
});

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
