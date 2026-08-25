import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as commissionController from '../controllers/commissionController.js';
import {
  createCommissionSchema,
  updateCommissionStatusSchema,
  listCommissionsQuerySchema,
  idParamSchema,
} from '../validators/commission.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /commissions:
 *   get:
 *     summary: List commissions (paginated, filterable by agent/status/date)
 *     tags: [Commissions]
 *   post:
 *     summary: Manually create a commission (adjustments; normally auto-created on booking)
 *     tags: [Commissions]
 */
router.get(
  '/',
  requirePermission('commissions.view'),
  validate({ query: listCommissionsQuerySchema }),
  commissionController.list
);
router.post(
  '/',
  requirePermission('commissions.create'),
  validate({ body: createCommissionSchema }),
  commissionController.create
);

router.get(
  '/:id',
  requirePermission('commissions.view'),
  validate({ params: idParamSchema }),
  commissionController.getById
);
router.patch(
  '/:id/status',
  requirePermission('commissions.update'),
  validate({ params: idParamSchema, body: updateCommissionStatusSchema }),
  commissionController.updateStatus
);

export default router;
