import { Buffer } from 'node:buffer';
import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { created } from '../../../../../server/lib/apiResponse.js';
import { parseParams } from '../../../../../server/lib/parseRequest.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { uploadCategoryParamSchema } from '../../../../../server/validators/upload.validators.js';
import { fileUploadHandler } from '../../../../../server/lib/FileUploadHandler.js';
import { ValidationError } from '../../../../../server/utils/errors.js';
import * as uploadService from '../../../../../server/services/uploadService.js';
import { recordAudit } from '../../../../../server/services/auditService.js';

/**
 * Replaces multer's disk/stream handling: a Route Handler reads the whole
 * body as FormData, and the File it returns already behaves like the
 * `{ buffer, originalname, mimetype, size }` shape multer produced with
 * memoryStorage -- so uploadService.storeFile needs no changes.
 */
async function readUploadedFile(request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') {
    throw new ValidationError('No file uploaded');
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, originalname: file.name, mimetype: file.type, size: buffer.length };
}

export const POST = apiHandler(async (request, ctx) => {
  const user = await withAuth(request);
  requirePermission(user, 'uploads.create');
  const { category } = parseParams(await ctx.params, uploadCategoryParamSchema);

  const file = await readUploadedFile(request);
  fileUploadHandler.validate({ category, file });

  const url = await uploadService.storeFile({ category, file });

  await recordAudit({
    userId: user.id,
    action: 'upload.created',
    entity: 'Upload',
    newValue: { category, url, originalName: file.originalname, size: file.size },
  });

  return created({ url }, 'File uploaded');
});
