'use server';

import { Buffer } from 'node:buffer';
import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { uploadCategoryParamSchema } from '../validators/upload.validators.js';
import { fileUploadHandler } from '../lib/FileUploadHandler.js';
import { ValidationError } from '../utils/errors.js';
import * as uploadService from '../services/uploadService.js';
import { recordAudit } from '../services/auditService.js';

/**
 * Mirrors app/api/v1/uploads/[category]/route.js. A Server Action can take a
 * File/FormData argument directly -- SettingsPage.jsx's <FileUploadField>
 * calls `onUpload(file)` imperatively (not a native <form action=>), so this
 * wraps the File in a FormData itself before extracting it, same shape the
 * Route Handler reads from request.formData().
 */
export async function uploadFileAction(category, file) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'uploads.create');
    const { category: cat } = parse('params', { category }, uploadCategoryParamSchema);

    if (!file) throw new ValidationError('No file uploaded');
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedFile = { buffer, originalname: file.name, mimetype: file.type, size: buffer.length };
    fileUploadHandler.validate({ category: cat, file: uploadedFile });

    const url = await uploadService.storeFile({ category: cat, file: uploadedFile });

    await recordAudit({
      userId: user.id,
      action: 'upload.created',
      entity: 'Upload',
      newValue: { category: cat, url, originalName: uploadedFile.originalname, size: uploadedFile.size },
    });

    return { url };
  });
}
