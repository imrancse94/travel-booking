import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as refundController from '../controllers/refundController.js';
import { createRefundSchema, listRefundsQuerySchema, idParamSchema } from '../validators/refund.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /refunds:
 *   get:
 *     summary: List refunds (paginated, filterable)
 *     tags: [Refunds]
 *   post:
 *     summary: Refund part or all of a payment
 *     tags: [Refunds]
 */
router.get('/', requirePermission('payments.view'), validate({ query: listRefundsQuerySchema }), refundController.list);
router.post(
  '/',
  requirePermission('payments.refund'),
  validate({ body: createRefundSchema }),
  refundController.create
);

router.get('/:id', requirePermission('payments.view'), validate({ params: idParamSchema }), refundController.getById);

export default router;
