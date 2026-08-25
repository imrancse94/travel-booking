import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as settingController from '../controllers/settingController.js';
import { updateSettingSchema } from '../validators/setting.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /settings:
 *   get:
 *     summary: Get all agency settings (merged with defaults)
 *     tags: [Settings]
 *   put:
 *     summary: Update one or more settings
 *     tags: [Settings]
 */
router.get('/', requirePermission('settings.view'), settingController.getSettings);
router.put('/', requirePermission('settings.update'), validate({ body: updateSettingSchema }), settingController.updateSettings);

export default router;
