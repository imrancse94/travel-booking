import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { fileUploadHandler } from '../lib/FileUploadHandler.js';
import * as uploadController from '../controllers/uploadController.js';
import { uploadCategoryParamSchema } from '../validators/upload.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /uploads/{category}:
 *   post:
 *     summary: Upload a single file (category e.g. hotels, rooms, documents, passports, invoices)
 *     tags: [Uploads]
 */
router.post(
  '/:category',
  requirePermission('uploads.create'),
  validate({ params: uploadCategoryParamSchema }),
  fileUploadHandler.middleware('file'),
  uploadController.uploadFile
);

export default router;
