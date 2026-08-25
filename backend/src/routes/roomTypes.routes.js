import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as roomTypeController from '../controllers/roomTypeController.js';
import {
  createRoomTypeSchema,
  updateRoomTypeSchema,
  listRoomTypesQuerySchema,
  idParamSchema,
  roomTypeImageIdParamSchema,
  roomTypeAmenityIdParamSchema,
  addRoomTypeImageSchema,
  assignAmenitySchema,
  setAmenitiesSchema,
  listRatesQuerySchema,
} from '../validators/roomType.validators.js';
import { createRoomRateSchema } from '../validators/ratePlan.validators.js';

export const router = Router();

/**
 * @openapi
 * /room-types:
 *   get:
 *     summary: List room types (public, paginated; filter by hotelId/search)
 *     tags: [Room Types]
 *   post:
 *     summary: Create a room type
 *     tags: [Room Types]
 */
router.get('/', validate({ query: listRoomTypesQuerySchema }), roomTypeController.list);
router.post(
  '/',
  authenticate,
  requirePermission('room_types.create'),
  validate({ body: createRoomTypeSchema }),
  roomTypeController.create
);

/**
 * @openapi
 * /room-types/{id}:
 *   get:
 *     summary: Get room type details (public, customer-facing)
 *     tags: [Room Types]
 *   put:
 *     summary: Update a room type
 *     tags: [Room Types]
 *   delete:
 *     summary: Soft-delete a room type
 *     tags: [Room Types]
 */
router.get('/:id', validate({ params: idParamSchema }), roomTypeController.getById);
router.put(
  '/:id',
  authenticate,
  requirePermission('room_types.update'),
  validate({ params: idParamSchema, body: updateRoomTypeSchema }),
  roomTypeController.update
);
router.delete(
  '/:id',
  authenticate,
  requirePermission('room_types.delete'),
  validate({ params: idParamSchema }),
  roomTypeController.remove
);

/**
 * @openapi
 * /room-types/{id}/images:
 *   post:
 *     summary: Add an image to a room type
 *     tags: [Room Types]
 */
router.post(
  '/:id/images',
  authenticate,
  requirePermission('room_types.update'),
  validate({ params: idParamSchema, body: addRoomTypeImageSchema }),
  roomTypeController.addImage
);

/**
 * @openapi
 * /room-types/{id}/images/{imageId}:
 *   delete:
 *     summary: Remove an image from a room type
 *     tags: [Room Types]
 */
router.delete(
  '/:id/images/:imageId',
  authenticate,
  requirePermission('room_types.update'),
  validate({ params: roomTypeImageIdParamSchema }),
  roomTypeController.removeImage
);

/**
 * @openapi
 * /room-types/{id}/amenities:
 *   post:
 *     summary: Assign an amenity to a room type
 *     tags: [Room Types]
 */
router.post(
  '/:id/amenities',
  authenticate,
  requirePermission('room_types.update'),
  validate({ params: idParamSchema, body: assignAmenitySchema }),
  roomTypeController.assignAmenity
);

router.put(
  '/:id/amenities',
  authenticate,
  requirePermission('room_types.update'),
  validate({ params: idParamSchema, body: setAmenitiesSchema }),
  roomTypeController.setAmenities
);

/**
 * @openapi
 * /room-types/{id}/amenities/{amenityId}:
 *   delete:
 *     summary: Remove an amenity from a room type
 *     tags: [Room Types]
 */
router.delete(
  '/:id/amenities/:amenityId',
  authenticate,
  requirePermission('room_types.update'),
  validate({ params: roomTypeAmenityIdParamSchema }),
  roomTypeController.unassignAmenity
);

/**
 * @openapi
 * /room-types/{id}/rates:
 *   get:
 *     summary: List room rates configured for a room type
 *     tags: [Rate Plans]
 *   post:
 *     summary: Create a room rate for a room type over a date range
 *     tags: [Rate Plans]
 */
router.get(
  '/:id/rates',
  authenticate,
  requirePermission('rate_plans.view'),
  validate({ params: idParamSchema, query: listRatesQuerySchema }),
  roomTypeController.listRates
);
router.post(
  '/:id/rates',
  authenticate,
  requirePermission('rate_plans.create'),
  validate({ params: idParamSchema, body: createRoomRateSchema }),
  roomTypeController.createRate
);

export default router;
