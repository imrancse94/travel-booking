import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseBody, parseQuery } from '../../../../../server/lib/parseRequest.js';
import { paginated, created } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../../server/utils/pagination.js';
import {
  createTourBookingSchema,
  listTourBookingsQuerySchema,
} from '../../../../../server/validators/tourBooking.validators.js';
import * as tourBookingService from '../../../../../server/services/tourBookingService.js';
import * as customerService from '../../../../../server/services/customerService.js';
import { ValidationError } from '../../../../../server/utils/errors.js';

function isStaff(user) {
  return user.roles.some((r) => r !== 'Customer');
}

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'tour_bookings.view');
  const query = parseQuery(request, listTourBookingsQuerySchema);
  const { page, limit, skip } = parsePagination(query);

  if (!isStaff(user)) {
    const own = await customerService.findCustomerByUserId(user.id);
    query.customerId = own ? own.id : '00000000-0000-0000-0000-000000000000';
  }

  const { items, total } = await tourBookingService.listTourBookings({ ...query, page, limit, skip });
  return paginated({ items, page, limit, total });
});

export const POST = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'tour_bookings.create');
  const body = await parseBody(request, createTourBookingSchema);

  const payload = { ...body, createdByUserId: user.id };
  const staff = isStaff(user);

  if (!staff) {
    // Customers cannot smuggle in a discount -- the service recalculates
    // price from the tour package regardless.
    delete payload.discountAmount;

    const own = await customerService.findCustomerByUserId(user.id);
    if (!own) throw new ValidationError('No customer profile is associated with this account');
    payload.customerId = own.id;
  } else if (!payload.customerId) {
    throw new ValidationError('customerId is required');
  }

  const booking = await tourBookingService.createTourBooking(payload);
  return created(booking, 'Tour booking created');
});
