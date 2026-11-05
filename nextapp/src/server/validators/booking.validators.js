import { z } from 'zod';

const guestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.string().optional(),
  address: z.string().optional(),
  specialRequirements: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const roomSelectionSchema = z
  .object({
    // A specific physical room (staff picking an exact room), or a room
    // type (the customer-facing case: "a Deluxe room", not room 214) --
    // the server picks and locks an available room of that type.
    roomId: z.string().uuid().optional(),
    roomTypeId: z.string().uuid().optional(),
    ratePlanId: z.string().uuid().optional(),
    adults: z.number().int().min(1).optional(),
    children: z.number().int().min(0).optional(),
  })
  .refine((v) => Boolean(v.roomId || v.roomTypeId), { message: 'Either roomId or roomTypeId is required' });

const serviceSelectionSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.number().int().min(1).optional(),
});

export const createBookingSchema = z.object({
  hotelId: z.string().uuid(),
  // Required for staff (booking on behalf of a customer); a Customer caller's
  // own customerId is resolved server-side and this is ignored if present.
  customerId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  checkIn: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid check-in date'),
  checkOut: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid check-out date'),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  specialRequests: z.string().optional(),
  source: z.enum(['website', 'mobile_app', 'admin', 'agent', 'walk_in', 'api']).default('website'),
  rooms: z.array(roomSelectionSchema).min(1),
  guests: z.array(guestSchema).min(1),
  services: z.array(serviceSelectionSchema).optional(),
  discountAmount: z.number().min(0).optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
  immediateConfirm: z.boolean().optional(),
});

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  hotelId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export const checkInOutSchema = z.object({
  notes: z.string().optional(),
});

export const availabilityQuerySchema = z
  .object({
    destination: z.string().optional(),
    hotelId: z.string().uuid().optional(),
    checkIn: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid check-in date'),
    checkOut: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid check-out date'),
    adults: z.coerce.number().int().min(1).default(1),
    children: z.coerce.number().int().min(0).default(0),
    rooms: z.coerce.number().int().min(1).default(1),
    roomTypeId: z.string().uuid().optional(),
    starRating: z.coerce.number().int().min(1).max(5).optional(),
  })
  // Same rule booking creation enforces (see createBooking): without it a
  // reversed range reported rooms as "available" for an impossible stay, with
  // null nights/pricing, instead of failing the request.
  .refine((q) => new Date(q.checkOut) > new Date(q.checkIn), {
    message: 'Check-out date must be after check-in date',
    path: ['checkOut'],
  });

export const idParamSchema = z.object({ id: z.string().uuid() });
