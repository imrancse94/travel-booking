import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import { AuthorizationError, NotFoundError } from '../utils/errors.js';
import * as paymentService from '../services/paymentService.js';
import * as customerRepository from '../repositories/customerRepository.js';
import * as bookingRepository from '../repositories/bookingRepository.js';

function isStaff(req) {
  return req.user.roles.some((r) => r !== 'Customer');
}

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { ...req.query };

  if (!isStaff(req)) {
    const own = await customerRepository.findByUserId(req.user.id);
    query.customerId = own ? own.id : '00000000-0000-0000-0000-000000000000';
  }

  const { items, total } = await paymentService.listPayments({ ...query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPayment(req.params.id);

  if (!isStaff(req)) {
    const own = await customerRepository.findByUserId(req.user.id);
    if (!own || payment.booking?.customerId !== own.id) throw new AuthorizationError();
  }

  return success(res, { data: payment });
});

export const create = asyncHandler(async (req, res) => {
  if (!isStaff(req)) {
    // A customer may only pay toward their own booking.
    const own = await customerRepository.findByUserId(req.user.id);
    const booking = own ? await bookingRepository.findBookingRawById(req.body.bookingId) : null;
    if (!own || !booking || booking.customerId !== own.id) throw new NotFoundError('Booking not found');
  }

  const payment = await paymentService.recordPayment(req.body, req.user.id);
  return created(res, payment, payment.status === 'paid' ? 'Payment recorded' : 'Payment attempt recorded (declined)');
});
