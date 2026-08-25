import { z } from 'zod';

export const createTourPackageSchema = z.object({
  destinationId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  durationDays: z.number().int().min(1),
  price: z.number().min(0),
  currency: z.string().min(1).optional(),
  maxParticipants: z.number().int().min(1),
  includedServices: z.string().optional(),
  excludedServices: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateTourPackageSchema = z.object({
  destinationId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  durationDays: z.number().int().min(1).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().min(1).optional(),
  maxParticipants: z.number().int().min(1).optional(),
  includedServices: z.string().optional(),
  excludedServices: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const listTourPackagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  destinationId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export const tourIdParamSchema = z.object({ tourId: z.string().uuid() });

export const itineraryDayParamSchema = z.object({
  tourId: z.string().uuid(),
  day: z.coerce.number().int().min(1),
});

export const createItineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  activities: z.string().optional(),
  meals: z.string().optional(),
  accommodation: z.string().optional(),
  transportation: z.string().optional(),
});

export const updateItineraryDaySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  activities: z.string().optional(),
  meals: z.string().optional(),
  accommodation: z.string().optional(),
  transportation: z.string().optional(),
});

export const imageParamSchema = z.object({
  tourId: z.string().uuid(),
  imageId: z.string().uuid(),
});

export const createTourImageSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateTourImageSchema = z.object({
  url: z.string().url().optional(),
  caption: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
