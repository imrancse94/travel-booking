import { z } from 'zod';

export const createTourBookingSchema = z.object({
  tourPackageId: z.string().uuid(),
  // Required for staff; a Customer caller's own customerId is resolved
  // server-side and this is ignored if present.
  customerId: z.string().uuid().optional(),
  participants: z.number().int().min(1),
  travelDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid travel date'),
  discountAmount: z.number().min(0).optional(),
});

export const listTourBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  customerId: z.string().uuid().optional(),
  tourPackageId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const cancelTourBookingSchema = z.object({
  reason: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
