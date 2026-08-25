import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as serviceController from '../controllers/serviceController.js';
import {
  createServiceSchema,
  updateServiceSchema,
  listServicesQuerySchema,
  idParamSchema,
} from '../validators/service.validators.js';

export const router = Router();

/**
 * @openapi
 * /services:
 *   get:
 *     summary: List extra services catalog (airport pickup, breakfast, extra bed, ...) -- public, so the customer-facing checkout can offer them
 *     tags: [Services]
 *   post:
 *     summary: Create a catalog service
 *     tags: [Services]
 */
router.get('/', validate({ query: listServicesQuerySchema }), serviceController.list);
router.post(
  '/',
  authenticate,
  requirePermission('services.create'),
  validate({ body: createServiceSchema }),
  serviceController.create
);

router.get('/:id', validate({ params: idParamSchema }), serviceController.getById);
router.put(
  '/:id',
  authenticate,
  requirePermission('services.update'),
  validate({ params: idParamSchema, body: updateServiceSchema }),
  serviceController.update
);
router.delete(
  '/:id',
  authenticate,
  requirePermission('services.delete'),
  validate({ params: idParamSchema }),
  serviceController.remove
);

export default router;
