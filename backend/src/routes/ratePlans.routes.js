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
  createGeneralRoomRateSchema,
  listRoomRatesQuerySchema,
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
 * /rate-plans/room-rates:
 *   get:
 *     summary: List room rates, optionally scoped to one room type via ?roomTypeId
 *     tags: [Rate Plans]
 *   post:
 *     summary: Create a room rate (roomTypeId is part of the body here, unlike the nested /room-types/{id}/rates route)
 *     tags: [Rate Plans]
 */
router.get(
  '/room-rates',
  requirePermission('rate_plans.view'),
  validate({ query: listRoomRatesQuerySchema }),
  ratePlanController.listRoomRates
);
router.post(
  '/room-rates',
  requirePermission('rate_plans.create'),
  validate({ body: createGeneralRoomRateSchema }),
  ratePlanController.createRoomRate
);

/**
 * @openapi
 * /rate-plans/room-rates/{id}:
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
  '/room-rates/:id',
  requirePermission('rate_plans.view'),
  validate({ params: idParamSchema }),
  ratePlanController.getRoomRate
);
router.put(
  '/room-rates/:id',
  requirePermission('rate_plans.update'),
  validate({ params: idParamSchema, body: updateRoomRateSchema }),
  ratePlanController.updateRoomRate
);
router.delete(
  '/room-rates/:id',
  requirePermission('rate_plans.delete'),
  validate({ params: idParamSchema }),
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
