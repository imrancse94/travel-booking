import { z } from 'zod';

export const uploadCategoryParamSchema = z.object({
  category: z.enum(['hotels', 'rooms', 'documents', 'passports', 'invoices']),
});
