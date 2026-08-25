import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as transportController from '../controllers/transportController.js';
import {
  createVehicleSchema,
  updateVehicleSchema,
  listVehiclesQuerySchema,
  createDriverSchema,
  updateDriverSchema,
  listDriversQuerySchema,
  createTransportBookingSchema,
  updateTransportBookingSchema,
  listTransportBookingsQuerySchema,
  idParamSchema,
} from '../validators/transport.validators.js';

export const router = Router();

router.use(authenticate);

// ==================================================
// Vehicles
// ==================================================

router.get(
  '/vehicles',
  requirePermission('transport.view'),
  validate({ query: listVehiclesQuerySchema }),
  transportController.listVehicles
);
router.post(
  '/vehicles',
  requirePermission('transport.create'),
  validate({ body: createVehicleSchema }),
  transportController.createVehicle
);
router.get(
  '/vehicles/:id',
  requirePermission('transport.view'),
  validate({ params: idParamSchema }),
  transportController.getVehicle
);
router.put(
  '/vehicles/:id',
  requirePermission('transport.update'),
  validate({ params: idParamSchema, body: updateVehicleSchema }),
  transportController.updateVehicle
);
router.delete(
  '/vehicles/:id',
  requirePermission('transport.delete'),
  validate({ params: idParamSchema }),
  transportController.removeVehicle
);

// ==================================================
// Drivers
// ==================================================

router.get(
  '/drivers',
  requirePermission('transport.view'),
  validate({ query: listDriversQuerySchema }),
  transportController.listDrivers
);
router.post(
  '/drivers',
  requirePermission('transport.create'),
  validate({ body: createDriverSchema }),
  transportController.createDriver
);
router.get(
  '/drivers/:id',
  requirePermission('transport.view'),
  validate({ params: idParamSchema }),
  transportController.getDriver
);
router.put(
  '/drivers/:id',
  requirePermission('transport.update'),
  validate({ params: idParamSchema, body: updateDriverSchema }),
  transportController.updateDriver
);
router.delete(
  '/drivers/:id',
  requirePermission('transport.delete'),
  validate({ params: idParamSchema }),
  transportController.removeDriver
);

// ==================================================
// Transport bookings
// ==================================================

router.get(
  '/bookings',
  requirePermission('transport.view'),
  validate({ query: listTransportBookingsQuerySchema }),
  transportController.listBookings
);
router.post(
  '/bookings',
  requirePermission('transport.create'),
  validate({ body: createTransportBookingSchema }),
  transportController.createBooking
);
router.get(
  '/bookings/:id',
  requirePermission('transport.view'),
  validate({ params: idParamSchema }),
  transportController.getBooking
);
router.put(
  '/bookings/:id',
  requirePermission('transport.update'),
  validate({ params: idParamSchema, body: updateTransportBookingSchema }),
  transportController.updateBooking
);
router.delete(
  '/bookings/:id',
  requirePermission('transport.delete'),
  validate({ params: idParamSchema }),
  transportController.removeBooking
);

export default router;
