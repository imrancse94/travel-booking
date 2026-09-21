import path from 'node:path';
import { promises as fs } from 'node:fs';

/**
 * Replaces Express's `app.use('/uploads', express.static(...))`. Only serves
 * the locally-stored driver -- when FILE_STORAGE_DRIVER=s3, uploadService
 * already returns a direct S3 URL and this route is never hit for those files.
 */
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export async function GET(request, ctx) {
  const { path: segments } = await ctx.params;

  // Reject any segment that could escape UPLOAD_ROOT (e.g. "..") before
  // touching the filesystem.
  if (!segments?.length || segments.some((s) => s === '..' || s.includes('/') || s.includes('\\'))) {
    return new Response('Not found', { status: 404 });
  }

  const filePath = path.join(UPLOAD_ROOT, ...segments);
  if (!filePath.startsWith(UPLOAD_ROOT)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const file = await fs.readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        // Uploaded filenames already include a random suffix (see
        // uploadService.buildFilename), so the content at a given URL never
        // changes -- safe to cache for a long time.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
