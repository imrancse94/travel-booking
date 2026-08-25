import { z } from 'zod';

export const createPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(['cash', 'bank_transfer', 'card', 'mobile_banking', 'online_gateway']),
  gateway: z.enum(['mock', 'stripe', 'paypal']).optional(),
  metadata: z.record(z.any()).optional(),
});

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  bookingId: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded']).optional(),
  method: z.enum(['cash', 'bank_transfer', 'card', 'mobile_banking', 'online_gateway']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
