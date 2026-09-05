import { z } from 'zod';

const ratePlanTypeEnum = z.enum(['room_only', 'breakfast_included', 'half_board', 'full_board', 'all_inclusive']);

export const createRatePlanSchema = z.object({
  name: z.string().min(1),
  type: ratePlanTypeEnum.default('room_only'),
  description: z.string().optional(),
});

export const updateRatePlanSchema = createRatePlanSchema.partial();

export const listRatePlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  type: ratePlanTypeEnum.optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export const createRoomRateSchema = z.object({
  ratePlanId: z.string().uuid(),
  startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid start date'),
  endDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid end date'),
  price: z.number().min(0),
  extraAdultPrice: z.number().min(0).optional(),
  extraChildPrice: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  priority: z.number().int().optional(),
});

// Same shape, but for the un-nested /rate-plans/room-rates endpoint, which
// (unlike /room-types/:id/rates) has no room type in the URL to take it from.
export const createGeneralRoomRateSchema = createRoomRateSchema.extend({
  roomTypeId: z.string().uuid(),
});

export const listRoomRatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  roomTypeId: z.string().uuid().optional(),
});

export const updateRoomRateSchema = z.object({
  ratePlanId: z.string().uuid().optional(),
  startDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid start date')
    .optional(),
  endDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid end date')
    .optional(),
  price: z.number().min(0).optional(),
  extraAdultPrice: z.number().min(0).optional(),
  extraChildPrice: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  priority: z.number().int().optional(),
});
