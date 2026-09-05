import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as settingController from '../controllers/settingController.js';
import { updateSettingSchema } from '../validators/setting.validators.js';

export const router = Router();

/**
 * @openapi
 * /settings/public:
 *   get:
 *     summary: Branding and formatting settings visible without a session
 *     tags: [Settings]
 */
// Mounted before the guard below: the sign-in page needs the agency's name and
// logo before anyone has authenticated.
router.get('/public', settingController.getPublicSettings);

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
