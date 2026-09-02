import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as activityLogController from '../controllers/activityLogController.js';
import { listActivityLogsQuerySchema } from '../validators/activityLog.validators.js';

export const router = Router();

// Read-only, and gated on activity_logs.view -- these entries include IP
// addresses, user agents and (redacted) request bodies.
router.use(authenticate, requirePermission('activity_logs.view'));

/**
 * @openapi
 * /activity-logs/dates:
 *   get:
 *     summary: Days that have an activity log
 *     tags: [Activity logs]
 */
router.get('/dates', activityLogController.dates);

/**
 * @openapi
 * /activity-logs:
 *   get:
 *     summary: Search one day's user-activity log
 *     tags: [Activity logs]
 */
router.get('/', validate({ query: listActivityLogsQuerySchema }), activityLogController.list);
