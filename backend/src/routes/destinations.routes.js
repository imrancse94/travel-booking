import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as destinationController from '../controllers/destinationController.js';
import {
  createDestinationSchema,
  updateDestinationSchema,
  listDestinationsQuerySchema,
  idParamSchema,
} from '../validators/destination.validators.js';

export const router = Router();

/**
 * @openapi
 * /destinations:
 *   get:
 *     summary: List destinations (public, customer-facing)
 *     tags: [Destinations]
 *   post:
 *     summary: Create a destination
 *     tags: [Destinations]
 */
router.get('/', validate({ query: listDestinationsQuerySchema }), destinationController.list);
router.get('/:id', validate({ params: idParamSchema }), destinationController.getById);

router.post(
  '/',
  authenticate,
  requirePermission('destinations.create'),
  validate({ body: createDestinationSchema }),
  destinationController.create
);
router.put(
  '/:id',
  authenticate,
  requirePermission('destinations.update'),
  validate({ params: idParamSchema, body: updateDestinationSchema }),
  destinationController.update
);
router.delete(
  '/:id',
  authenticate,
  requirePermission('destinations.delete'),
  validate({ params: idParamSchema }),
  destinationController.remove
);

export default router;
