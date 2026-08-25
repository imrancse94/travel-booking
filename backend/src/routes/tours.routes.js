import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as tourPackageController from '../controllers/tourPackageController.js';
import * as tourBookingController from '../controllers/tourBookingController.js';
import {
  createTourPackageSchema,
  updateTourPackageSchema,
  listTourPackagesQuerySchema,
  idParamSchema,
  tourIdParamSchema,
  itineraryDayParamSchema,
  createItineraryDaySchema,
  updateItineraryDaySchema,
  imageParamSchema,
  createTourImageSchema,
  updateTourImageSchema,
} from '../validators/tourPackage.validators.js';
import {
  createTourBookingSchema,
  listTourBookingsQuerySchema,
  cancelTourBookingSchema,
  idParamSchema as tourBookingIdParamSchema,
} from '../validators/tourBooking.validators.js';

export const router = Router();

// ==================================================
// Tour bookings -- mounted first (as literal /bookings paths) so they are
// not shadowed by the generic /:id tour-package routes below.
// ==================================================

router.get(
  '/bookings',
  authenticate,
  requirePermission('tour_bookings.view'),
  validate({ query: listTourBookingsQuerySchema }),
  tourBookingController.list
);
router.post(
  '/bookings',
  authenticate,
  requirePermission('tour_bookings.create'),
  validate({ body: createTourBookingSchema }),
  tourBookingController.create
);
router.get(
  '/bookings/:id',
  authenticate,
  validate({ params: tourBookingIdParamSchema }),
  tourBookingController.getById
);
router.post(
  '/bookings/:id/cancel',
  authenticate,
  requirePermission('tour_bookings.update'),
  validate({ params: tourBookingIdParamSchema, body: cancelTourBookingSchema }),
  tourBookingController.cancel
);

// ==================================================
// Tour packages (public catalog reads, staff-only mutations)
// ==================================================

/**
 * @openapi
 * /tours:
 *   get:
 *     summary: List tour packages (public, customer-facing)
 *     tags: [Tours]
 *   post:
 *     summary: Create a tour package
 *     tags: [Tours]
 */
router.get('/', validate({ query: listTourPackagesQuerySchema }), tourPackageController.list);

router.post(
  '/',
  authenticate,
  requirePermission('tours.create'),
  validate({ body: createTourPackageSchema }),
  tourPackageController.create
);

// ---- Itinerary sub-resource ----

router.get(
  '/:tourId/itinerary',
  validate({ params: tourIdParamSchema }),
  tourPackageController.listItinerary
);
router.post(
  '/:tourId/itinerary',
  authenticate,
  requirePermission('tours.update'),
  validate({ params: tourIdParamSchema, body: createItineraryDaySchema }),
  tourPackageController.addItineraryDay
);
router.put(
  '/:tourId/itinerary/:day',
  authenticate,
  requirePermission('tours.update'),
  validate({ params: itineraryDayParamSchema, body: updateItineraryDaySchema }),
  tourPackageController.updateItineraryDay
);
router.delete(
  '/:tourId/itinerary/:day',
  authenticate,
  requirePermission('tours.delete'),
  validate({ params: itineraryDayParamSchema }),
  tourPackageController.removeItineraryDay
);

// ---- Images sub-resource ----

router.get(
  '/:tourId/images',
  validate({ params: tourIdParamSchema }),
  tourPackageController.listImages
);
router.post(
  '/:tourId/images',
  authenticate,
  requirePermission('tours.update'),
  validate({ params: tourIdParamSchema, body: createTourImageSchema }),
  tourPackageController.addImage
);
router.put(
  '/:tourId/images/:imageId',
  authenticate,
  requirePermission('tours.update'),
  validate({ params: imageParamSchema, body: updateTourImageSchema }),
  tourPackageController.updateImage
);
router.delete(
  '/:tourId/images/:imageId',
  authenticate,
  requirePermission('tours.delete'),
  validate({ params: imageParamSchema }),
  tourPackageController.removeImage
);

// ---- Tour package detail / update / delete ----

router.get('/:id', validate({ params: idParamSchema }), tourPackageController.getById);
router.put(
  '/:id',
  authenticate,
  requirePermission('tours.update'),
  validate({ params: idParamSchema, body: updateTourPackageSchema }),
  tourPackageController.update
);
router.delete(
  '/:id',
  authenticate,
  requirePermission('tours.delete'),
  validate({ params: idParamSchema }),
  tourPackageController.remove
);

export default router;
