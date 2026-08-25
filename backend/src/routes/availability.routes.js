import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import * as availabilityController from '../controllers/availabilityController.js';
import { availabilityQuerySchema } from '../validators/booking.validators.js';

export const router = Router();

/**
 * @openapi
 * /rooms/availability:
 *   get:
 *     summary: Search hotel/room availability for a date range (public)
 *     tags: [Availability]
 */
router.get('/', validate({ query: availabilityQuerySchema }), availabilityController.search);

export default router;
