import { z } from 'zod';

export const createInvoiceSchema = z.object({
  bookingId: z.string().uuid(),
});

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.enum(['unpaid', 'partially_paid', 'paid', 'void']).optional(),
  bookingId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
