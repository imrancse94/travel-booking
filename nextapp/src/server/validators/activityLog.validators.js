import { z } from 'zod';

export const listActivityLogsQuerySchema = z.object({
  // Strict, because it selects a filename. activityLogService re-checks it and
  // confirms the resolved path stays inside the logs directory.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
  search: z.string().max(200).optional(),
  outcome: z.enum(['success', 'failure']).optional(),
  method: z.enum(['POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  userEmail: z.string().max(200).optional(),
  status: z.coerce.number().int().min(100).max(599).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
