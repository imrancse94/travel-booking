import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../../server/utils/pagination.js';
import {
  createTransportBookingSchema,
  listTransportBookingsQuerySchema,
} from '../../../../../server/validators/transport.validators.js';
import * as transportService from '../../../../../server/services/transportService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'transport.view');
  const query = parseQuery(request, listTransportBookingsQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await transportService.listBookings({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'transport.create');
  const body = await parseBody(request, createTransportBookingSchema);
  const booking = await transportService.createBooking(body, user.id);
  return created(booking, 'Transport booking created');
});
