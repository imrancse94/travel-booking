import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as ratePlanController from '../controllers/ratePlanController.js';
import {
  createRatePlanSchema,
  updateRatePlanSchema,
  listRatePlansQuerySchema,
  idParamSchema,
  rateIdParamSchema,
  updateRoomRateSchema,
} from '../validators/ratePlan.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /rate-plans:
 *   get:
 *     summary: List rate plans (paginated; filter by type/search)
 *     tags: [Rate Plans]
 *   post:
 *     summary: Create a rate plan
 *     tags: [Rate Plans]
 */
router.get('/', requirePermission('rate_plans.view'), validate({ query: listRatePlansQuerySchema }), ratePlanController.list);
router.post(
  '/',
  requirePermission('rate_plans.create'),
  validate({ body: createRatePlanSchema }),
  ratePlanController.create
);

/**
 * @openapi
 * /rate-plans/rates/{rateId}:
 *   get:
 *     summary: Get a single room rate
 *     tags: [Rate Plans]
 *   put:
 *     summary: Update a room rate
 *     tags: [Rate Plans]
 *   delete:
 *     summary: Delete a room rate
 *     tags: [Rate Plans]
 */
router.get(
  '/rates/:rateId',
  requirePermission('rate_plans.view'),
  validate({ params: rateIdParamSchema }),
  ratePlanController.getRoomRate
);
router.put(
  '/rates/:rateId',
  requirePermission('rate_plans.update'),
  validate({ params: rateIdParamSchema, body: updateRoomRateSchema }),
  ratePlanController.updateRoomRate
);
router.delete(
  '/rates/:rateId',
  requirePermission('rate_plans.delete'),
  validate({ params: rateIdParamSchema }),
  ratePlanController.deleteRoomRate
);

/**
 * @openapi
 * /rate-plans/{id}:
 *   get:
 *     summary: Get rate plan details
 *     tags: [Rate Plans]
 *   put:
 *     summary: Update a rate plan
 *     tags: [Rate Plans]
 *   delete:
 *     summary: Delete a rate plan
 *     tags: [Rate Plans]
 */
router.get('/:id', requirePermission('rate_plans.view'), validate({ params: idParamSchema }), ratePlanController.getById);
router.put(
  '/:id',
  requirePermission('rate_plans.update'),
  validate({ params: idParamSchema, body: updateRatePlanSchema }),
  ratePlanController.update
);
router.delete(
  '/:id',
  requirePermission('rate_plans.delete'),
  validate({ params: idParamSchema }),
  ratePlanController.remove
);

export default router;
