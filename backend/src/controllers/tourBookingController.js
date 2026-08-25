import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors.js';
import { parsePagination } from '../utils/pagination.js';
import * as tourBookingService from '../services/tourBookingService.js';
import * as tourBookingRepository from '../repositories/tourBookingRepository.js';
import * as customerRepository from '../repositories/customerRepository.js';

export const create = asyncHandler(async (req, res) => {
  const isStaff = req.user.roles.some((r) => r !== 'Customer');
  const payload = { ...req.body, createdByUserId: req.user.id };

  if (!isStaff) {
    // Customers cannot smuggle in a discount -- the backend recalculates
    // price from the tour package regardless (see tourBookingService).
    delete payload.discountAmount;

    const own = await customerRepository.findByUserId(req.user.id);
    if (!own) throw new ValidationError('No customer profile is associated with this account');
    payload.customerId = own.id;
  } else if (!payload.customerId) {
    throw new ValidationError('customerId is required');
  }

  const booking = await tourBookingService.createTourBooking(payload);
  return created(res, booking, 'Tour booking created');
});

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { ...req.query };

  const isStaff = req.user.roles.some((r) => r !== 'Customer');
  if (!isStaff) {
    const own = await customerRepository.findByUserId(req.user.id);
    query.customerId = own ? own.id : '00000000-0000-0000-0000-000000000000';
  }

  const { items, total } = await tourBookingRepository.list({ ...query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const booking = await tourBookingRepository.findById(req.params.id);
  if (!booking) throw new NotFoundError('Tour booking not found');

  const isOwner = req.user.roles.includes('Customer') && booking.customer?.userId === req.user.id;
  const isStaff = req.user.roles.some((r) => r !== 'Customer');
  if (!isOwner && !isStaff) throw new AuthorizationError();

  return success(res, { data: booking });
});

export const cancel = asyncHandler(async (req, res) => {
  const booking = await tourBookingService.cancelTourBooking(req.params.id, req.user.id);
  return success(res, { data: booking, message: 'Tour booking cancelled' });
});
