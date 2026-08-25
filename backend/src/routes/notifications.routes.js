import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as notificationController from '../controllers/notificationController.js';
import { listNotificationsQuerySchema, notificationIdParamSchema } from '../validators/notification.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: List the authenticated user's notifications (paginated)
 *     tags: [Notifications]
 */
router.get('/', requirePermission('notifications.view'), validate({ query: listNotificationsQuerySchema }), notificationController.list);

// Always the caller's own notifications -- authentication alone is enough,
// no extra permission required.
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', validate({ params: notificationIdParamSchema }), notificationController.markOneAsRead);

export default router;
