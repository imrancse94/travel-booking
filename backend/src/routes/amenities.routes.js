import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as amenityController from '../controllers/amenityController.js';
import {
  createAmenitySchema,
  updateAmenitySchema,
  listAmenitiesQuerySchema,
  idParamSchema,
} from '../validators/amenity.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /amenities:
 *   get:
 *     summary: List amenities (paginated; filter by category/search)
 *     tags: [Amenities]
 *   post:
 *     summary: Create an amenity
 *     tags: [Amenities]
 */
router.get('/', requirePermission('amenities.view'), validate({ query: listAmenitiesQuerySchema }), amenityController.list);
router.post(
  '/',
  requirePermission('amenities.create'),
  validate({ body: createAmenitySchema }),
  amenityController.create
);

/**
 * @openapi
 * /amenities/{id}:
 *   get:
 *     summary: Get amenity details
 *     tags: [Amenities]
 *   put:
 *     summary: Update an amenity
 *     tags: [Amenities]
 *   delete:
 *     summary: Delete an amenity
 *     tags: [Amenities]
 */
router.get('/:id', requirePermission('amenities.view'), validate({ params: idParamSchema }), amenityController.getById);
router.put(
  '/:id',
  requirePermission('amenities.update'),
  validate({ params: idParamSchema, body: updateAmenitySchema }),
  amenityController.update
);
router.delete(
  '/:id',
  requirePermission('amenities.delete'),
  validate({ params: idParamSchema }),
  amenityController.remove
);

export default router;
