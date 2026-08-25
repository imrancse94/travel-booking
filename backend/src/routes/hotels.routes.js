import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as hotelController from '../controllers/hotelController.js';
import {
  createHotelSchema,
  updateHotelSchema,
  listHotelsQuerySchema,
  idParamSchema,
  hotelImageIdParamSchema,
  hotelAmenityIdParamSchema,
  addHotelImageSchema,
  assignAmenitySchema,
  setAmenitiesSchema,
} from '../validators/hotel.validators.js';

export const router = Router();

/**
 * @openapi
 * /hotels:
 *   get:
 *     summary: List hotels (public, paginated; filter by search/city/country/starRating/status)
 *     tags: [Hotels]
 *   post:
 *     summary: Create a hotel
 *     tags: [Hotels]
 */
router.get('/', validate({ query: listHotelsQuerySchema }), hotelController.list);
router.post(
  '/',
  authenticate,
  requirePermission('hotels.create'),
  validate({ body: createHotelSchema }),
  hotelController.create
);

/**
 * @openapi
 * /hotels/{id}:
 *   get:
 *     summary: Get hotel details (public, customer-facing)
 *     tags: [Hotels]
 *   put:
 *     summary: Update a hotel
 *     tags: [Hotels]
 *   delete:
 *     summary: Soft-delete a hotel
 *     tags: [Hotels]
 */
router.get('/:id', validate({ params: idParamSchema }), hotelController.getById);
router.put(
  '/:id',
  authenticate,
  requirePermission('hotels.update'),
  validate({ params: idParamSchema, body: updateHotelSchema }),
  hotelController.update
);
router.delete(
  '/:id',
  authenticate,
  requirePermission('hotels.delete'),
  validate({ params: idParamSchema }),
  hotelController.remove
);

/**
 * @openapi
 * /hotels/{id}/images:
 *   post:
 *     summary: Add an image to a hotel
 *     tags: [Hotels]
 */
router.post(
  '/:id/images',
  authenticate,
  requirePermission('hotels.update'),
  validate({ params: idParamSchema, body: addHotelImageSchema }),
  hotelController.addImage
);

/**
 * @openapi
 * /hotels/{id}/images/{imageId}:
 *   delete:
 *     summary: Remove an image from a hotel
 *     tags: [Hotels]
 */
router.delete(
  '/:id/images/:imageId',
  authenticate,
  requirePermission('hotels.update'),
  validate({ params: hotelImageIdParamSchema }),
  hotelController.removeImage
);

/**
 * @openapi
 * /hotels/{id}/amenities:
 *   post:
 *     summary: Assign an amenity to a hotel
 *     tags: [Hotels]
 */
router.post(
  '/:id/amenities',
  authenticate,
  requirePermission('hotels.update'),
  validate({ params: idParamSchema, body: assignAmenitySchema }),
  hotelController.assignAmenity
);

/**
 * @openapi
 * /hotels/{id}/amenities:
 *   put:
 *     summary: Replace a hotel's full amenity set
 *     tags: [Hotels]
 */
router.put(
  '/:id/amenities',
  authenticate,
  requirePermission('hotels.update'),
  validate({ params: idParamSchema, body: setAmenitiesSchema }),
  hotelController.setAmenities
);

/**
 * @openapi
 * /hotels/{id}/amenities/{amenityId}:
 *   delete:
 *     summary: Remove an amenity from a hotel
 *     tags: [Hotels]
 */
router.delete(
  '/:id/amenities/:amenityId',
  authenticate,
  requirePermission('hotels.update'),
  validate({ params: hotelAmenityIdParamSchema }),
  hotelController.unassignAmenity
);

export default router;
