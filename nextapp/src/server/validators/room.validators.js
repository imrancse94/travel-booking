import { z } from 'zod';

const roomStatusEnum = z.enum(['available', 'occupied', 'maintenance', 'inactive']);

export const createRoomSchema = z.object({
  roomTypeId: z.string().uuid(),
  roomNumber: z.string().min(1),
  floor: z.string().optional(),
  status: roomStatusEnum.optional(),
});

export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).optional(),
  floor: z.string().optional(),
  status: roomStatusEnum.optional(),
});

export const listRoomsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  hotelId: z.string().uuid().optional(),
  roomTypeId: z.string().uuid().optional(),
  status: roomStatusEnum.optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
