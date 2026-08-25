import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { s3Client } from '../lib/S3Client.js';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

function buildFilename(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

async function storeLocal({ category, file }) {
  const dir = path.join(UPLOAD_ROOT, category);
  await fs.mkdir(dir, { recursive: true });
  const filename = buildFilename(file.originalname);
  await fs.writeFile(path.join(dir, filename), file.buffer);
  // Served by the `app.use('/uploads', express.static(...))` line in app.js.
  return `/uploads/${category}/${filename}`;
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
  if (env.fileStorageDriver === 's3') {
    return storeS3({ category, file });
  }
  return storeLocal({ category, file });
}
