import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { bookingLimit } from '../../../../server/lib/rateLimit.js';
import { parsePagination } from '../../../../server/utils/pagination.js';
import { createBookingSchema, listBookingsQuerySchema } from '../../../../server/validators/booking.validators.js';
import * as bookingService from '../../../../server/services/bookingService.js';

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'bookings.view');
  const query = parseQuery(request, listBookingsQuerySchema);
  const { page, limit, skip } = parsePagination(query);
  const { items, total } = await bookingService.listBookingsForUser(user, { ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  bookingLimit(request, 'bookings');
  requirePermission(user, 'bookings.create');
  const body = await parseBody(request, createBookingSchema);
  const booking = await bookingService.createBookingForUser(user, body);
  return created(booking, 'Booking created');
});
