import { z } from 'zod';

export const createRefundSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().optional(),
});

export const listRefundsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'rejected']).optional(),
  paymentId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
