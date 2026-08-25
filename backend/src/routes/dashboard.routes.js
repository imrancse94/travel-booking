import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as dashboardController from '../controllers/dashboardController.js';
import { dashboardQuerySchema } from '../validators/dashboard.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /dashboard:
 *   get:
 *     summary: Role-aware dashboard summary (admin, hotel, or agent view; see ?view=)
 *     tags: [Dashboard]
 */
router.get('/', requirePermission('dashboard.view'), validate({ query: dashboardQuerySchema }), dashboardController.getDashboard);

export default router;
