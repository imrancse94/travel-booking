import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { s3Client } from '../lib/S3Client.js';
import sharp from 'sharp';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

// Fixed output size for a masked favicon: large enough to look sharp at the
// sizes browsers actually render a tab icon at (16-48px), small enough that
// nobody notices the file.
const FAVICON_SIZE = 256;

/**
 * Crops whatever was uploaded to a filled circle with transparent corners, so
 * the browser tab shows a round icon regardless of the source image's shape.
 * CSS cannot reach a <link rel="icon"> -- the transparency has to be baked
 * into the pixels -- so this always outputs PNG (the only common favicon
 * format with alpha) no matter what format came in.
 */
async function maskCircular(file) {
  const circleMask = Buffer.from(
    `<svg width="${FAVICON_SIZE}" height="${FAVICON_SIZE}">` +
      `<circle cx="${FAVICON_SIZE / 2}" cy="${FAVICON_SIZE / 2}" r="${FAVICON_SIZE / 2}" fill="#fff"/>` +
      `</svg>`
  );

  const buffer = await sharp(file.buffer)
    .resize(FAVICON_SIZE, FAVICON_SIZE, { fit: 'cover' })
    // dest-in keeps only the pixels under the mask's opaque circle, so
    // everything outside it becomes transparent rather than staying square.
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return {
    ...file,
    buffer,
    mimetype: 'image/png',
    originalname: `${path.parse(file.originalname || 'favicon').name}.png`,
    size: buffer.length,
  };
}

function buildFilename(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

async function storeLocal({ category, file }) {
  const dir = path.join(UPLOAD_ROOT, category);
  await fs.mkdir(dir, { recursive: true });
  const filename = buildFilename(file.originalname);
  await fs.writeFile(path.join(dir, filename), file.buffer);
  // Served by the `app.use('/uploads', express.static(...))` line in app.js,
  // and proxied at the same path by nginx (and by Next in development), so the
  // public origin resolves it. Absolute, so the URL also works from an email.
  return `${env.publicUrl}/uploads/${category}/${filename}`;
}

async function storeS3({ category, file }) {
  const filename = buildFilename(file.originalname);
  const key = `${category}/${filename}`;
  return s3Client.uploadObject({ key, body: file.buffer, contentType: file.mimetype });
}

/**
 * Stores an uploaded file (a multer in-memory file: { buffer, originalname,
 * mimetype, size }) under `category` using the configured driver
 * (env.fileStorageDriver: 'local' | 's3') and returns its accessible URL.
 */
export async function storeFile({ category, file }) {
  const resolvedFile = category === 'favicon' ? await maskCircular(file) : file;
  if (env.fileStorageDriver === 's3') {
    return storeS3({ category, file: resolvedFile });
  }
  return storeLocal({ category, file: resolvedFile });
}
