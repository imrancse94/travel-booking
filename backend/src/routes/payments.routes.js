import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { bookingLimiter } from '../middleware/rateLimiter.js';
import * as paymentController from '../controllers/paymentController.js';
import { createPaymentSchema, listPaymentsQuerySchema, idParamSchema } from '../validators/payment.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /payments:
 *   get:
 *     summary: List payments (paginated, filterable)
 *     tags: [Payments]
 *   post:
 *     summary: Record a payment against a booking via the payment gateway abstraction
 *     tags: [Payments]
 */
router.get('/', requirePermission('payments.view'), validate({ query: listPaymentsQuerySchema }), paymentController.list);
router.post(
  '/',
  bookingLimiter,
  requirePermission('payments.create'),
  validate({ body: createPaymentSchema }),
  paymentController.create
);

router.get('/:id', requirePermission('payments.view'), validate({ params: idParamSchema }), paymentController.getById);

export default router;
