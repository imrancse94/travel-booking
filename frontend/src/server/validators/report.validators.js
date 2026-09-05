import { z } from 'zod';
import { REPORT_NAMES } from '../services/reportService.js';

export const reportNameParamSchema = z.object({
  reportName: z.enum(REPORT_NAMES),
});

export const reportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  hotelId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'mobile_banking', 'online_gateway']).optional(),
  bookingSource: z.enum(['website', 'mobile_app', 'admin', 'agent', 'walk_in', 'api']).optional(),
});

export const reportExportQuerySchema = reportQuerySchema.extend({
  format: z.enum(['csv']).optional(),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
