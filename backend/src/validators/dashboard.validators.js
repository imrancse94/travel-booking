import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  view: z.enum(['admin', 'hotel', 'agent']).optional(),
  hotelId: z.string().uuid().optional(),
});
