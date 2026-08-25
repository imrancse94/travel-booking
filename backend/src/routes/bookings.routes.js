import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { bookingLimiter } from '../middleware/rateLimiter.js';
import * as bookingController from '../controllers/bookingController.js';
import {
  createBookingSchema,
  listBookingsQuerySchema,
  cancelBookingSchema,
  checkInOutSchema,
  idParamSchema,
} from '../validators/booking.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /bookings:
 *   get:
 *     summary: List bookings (paginated, filterable)
 *     tags: [Bookings]
 *   post:
 *     summary: Create a booking (price is always recalculated server-side)
 *     tags: [Bookings]
 */
router.get('/', requirePermission('bookings.view'), validate({ query: listBookingsQuerySchema }), bookingController.list);
router.post(
  '/',
  bookingLimiter,
  requirePermission('bookings.create'),
  validate({ body: createBookingSchema }),
  bookingController.create
);

router.get('/:id', validate({ params: idParamSchema }), bookingController.getById);

router.post(
  '/:id/cancel',
  requirePermission('bookings.cancel'),
  validate({ params: idParamSchema, body: cancelBookingSchema }),
  bookingController.cancel
);
router.post(
  '/:id/confirm',
  requirePermission('bookings.confirm'),
  validate({ params: idParamSchema }),
  bookingController.confirm
);
router.post(
  '/:id/check-in',
  requirePermission('bookings.checkin'),
  validate({ params: idParamSchema, body: checkInOutSchema }),
  bookingController.checkIn
);
router.post(
  '/:id/check-out',
  requirePermission('bookings.checkout'),
  validate({ params: idParamSchema, body: checkInOutSchema }),
  bookingController.checkOut
);

export default router;
