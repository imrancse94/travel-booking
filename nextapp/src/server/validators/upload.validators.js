import { z } from 'zod';

export const uploadCategoryParamSchema = z.object({
  category: z.enum(['hotels', 'rooms', 'branding', 'favicon', 'documents', 'passports', 'invoices']),
});
