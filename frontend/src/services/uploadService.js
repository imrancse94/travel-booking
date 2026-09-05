import { httpClient } from './httpClient.js';

// Matches backend/src/routes/uploads.routes.js. Categories the API accepts:
// hotels, rooms, branding, documents, passports, invoices.
const BASE = '/uploads';

/**
 * Uploads one file and resolves to the URL it is served from.
 *
 * The Content-Type header is deliberately not set: the browser has to add the
 * multipart boundary itself, and naming the type by hand strips it.
 */
export async function upload(category, file) {
  const body = new FormData();
  body.append('file', file);
  const res = await httpClient.post(`${BASE}/${category}`, body);
  return res.data.url;
}
