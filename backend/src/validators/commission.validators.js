import { z } from 'zod';

export const createCommissionSchema = z
  .object({
    agentId: z.string().uuid(),
    bookingId: z.string().uuid(),
    percentage: z.number().min(0).max(100),
    amount: z.number().min(0).optional(),
  })
  .refine((data) => data.percentage > 0 || data.amount !== undefined, {
    message: 'Provide a percentage or an explicit amount',
  });

export const updateCommissionStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'paid', 'cancelled']),
  paidAt: z.string().optional(),
});

export const listCommissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  agentId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  status: z.enum(['pending', 'approved', 'paid', 'cancelled']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
