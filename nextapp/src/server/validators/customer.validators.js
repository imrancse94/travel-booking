import { z } from 'zod';

export const createCustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  dateOfBirth: z.string().optional(),
  userId: z.string().uuid().optional(),
});

export const updateCustomerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  nationality: z.string().optional(),
});

export const customerHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.string().optional(),
});

export const createCustomerDocumentSchema = z.object({
  type: z.string().min(1),
  fileUrl: z.string().min(1),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export const documentParamSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
});
