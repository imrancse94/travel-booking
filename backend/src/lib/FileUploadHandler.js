import multer from 'multer';
import { ValidationError } from '../utils/errors.js';

// Thin wrapper around `multer`. Application code depends on this class,
// never on `multer` directly. Uses memory storage (not disk storage) so the
// same middleware works for both the local-disk and S3 upload drivers --
// uploadService.js decides what to do with the buffer.

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, 'application/pdf']);

const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB

// Categories that additionally accept PDFs (and get the larger size limit).
// Everything else (e.g. "hotels", "rooms") is treated as an image category.
const DOCUMENT_CATEGORIES = new Set(['documents', 'passports', 'invoices']);

export class FileUploadHandler {
  constructor({ maxImageBytes = DEFAULT_MAX_IMAGE_BYTES, maxDocumentBytes = DEFAULT_MAX_DOCUMENT_BYTES } = {}) {
    this.maxImageBytes = maxImageBytes;
    this.maxDocumentBytes = maxDocumentBytes;
  }

  isDocumentCategory(category) {
    return DOCUMENT_CATEGORIES.has(category);
  }

  allowedMimeTypes(category) {
    return this.isDocumentCategory(category) ? DOCUMENT_MIME_TYPES : IMAGE_MIME_TYPES;
  }

  maxBytesFor(category) {
    return this.isDocumentCategory(category) ? this.maxDocumentBytes : this.maxImageBytes;
  }

  /**
   * Returns Express middleware that accepts a single file on `fieldName`.
   * The upload category comes from `req.params.category` at request time
   * (routes mount this on `/uploads/:category`), so one instance can be
   * reused across every category instead of building N multer configs.
   */
  middleware(fieldName = 'file') {
    const upload = multer({
      storage: multer.memoryStorage(),
      // Hard ceiling at the multer layer (the larger of the two limits);
      // the exact per-category limit is enforced below once we know the size.
      limits: { fileSize: Math.max(this.maxImageBytes, this.maxDocumentBytes) },
      fileFilter: (req, file, cb) => {
        const category = req.params?.category;
        const allowed = this.allowedMimeTypes(category);
        if (!allowed.has(file.mimetype)) {
          return cb(new ValidationError(`Unsupported file type "${file.mimetype}" for category "${category}"`));
        }
        cb(null, true);
      },
    }).single(fieldName);

    return (req, res, next) => {
      upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          return next(new ValidationError(`Upload failed: ${err.message}`));
        }
        if (err) return next(err);
        if (!req.file) {
          return next(new ValidationError('No file uploaded'));
        }

        const maxBytes = this.maxBytesFor(req.params?.category);
        if (req.file.size > maxBytes) {
          return next(
            new ValidationError(`File exceeds the ${Math.round(maxBytes / (1024 * 1024))}MB limit for category "${req.params.category}"`)
          );
        }

        next();
      });
    };
  }
}

export const fileUploadHandler = new FileUploadHandler();
