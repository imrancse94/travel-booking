import { asyncHandler } from '../utils/asyncHandler.js';
import { created } from '../utils/apiResponse.js';
import { ValidationError } from '../utils/errors.js';
import * as uploadService from '../services/uploadService.js';
import { recordAudit } from '../services/auditService.js';

// POST /uploads/:category -- multipart/form-data, field name "file".
// fileUploadHandler middleware (route-level) has already validated
// type/size and populated req.file by the time this runs.
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError('No file uploaded');

  const url = await uploadService.storeFile({ category: req.params.category, file: req.file });

  await recordAudit({
    req,
    action: 'upload.created',
    entity: 'Upload',
    newValue: { category: req.params.category, url, originalName: req.file.originalname, size: req.file.size },
  });

  return created(res, { url }, 'File uploaded');
});
