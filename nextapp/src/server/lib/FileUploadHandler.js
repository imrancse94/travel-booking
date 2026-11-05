import { ValidationError } from '../utils/errors.js';

// A Route Handler reads the uploaded file via `request.formData()` itself
// (see uploads/[category]/route.js) -- there's no Express request/response
// stream for multer to attach to, so this is just the mime-type/size checks
// that used to run inside multer's fileFilter/limits, called directly
// against an already-read `{ buffer, mimetype, size }`.

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

  validate({ category, file }) {
    const allowed = this.allowedMimeTypes(category);
    if (!allowed.has(file.mimetype)) {
      throw new ValidationError(`Unsupported file type "${file.mimetype}" for category "${category}"`);
    }
    const maxBytes = this.maxBytesFor(category);
    if (file.size > maxBytes) {
      throw new ValidationError(`File exceeds the ${Math.round(maxBytes / (1024 * 1024))}MB limit for category "${category}"`);
    }
  }
}

export const fileUploadHandler = new FileUploadHandler();
