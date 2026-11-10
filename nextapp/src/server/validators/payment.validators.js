import { z } from 'zod';

export const createPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  // coerce: bookings report totalAmount as a decimal STRING ("205.00", straight from a
  // Postgres numeric), and the checkout sends it back unchanged. A strict z.number() rejected
  // that with "Validation failed", so no checkout payment could ever succeed.
  amount: z.coerce.number().positive(),
  method: z.enum(['cash', 'bank_transfer', 'card', 'mobile_banking', 'online_gateway']),
  gateway: z.enum(['mock', 'stripe', 'paypal', 'bkash', 'nagad']).optional(),
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
