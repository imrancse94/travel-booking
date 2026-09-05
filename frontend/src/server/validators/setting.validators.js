import { z } from 'zod';

// Accepts either a single { key, value } update, or a bulk { updates: [...] }
// array of the same shape.
export const updateSettingSchema = z.union([
  z.object({ key: z.string().min(1), value: z.any() }),
  z.object({ updates: z.array(z.object({ key: z.string().min(1), value: z.any() })).min(1) }),
]);
