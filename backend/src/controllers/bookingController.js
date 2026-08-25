import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors.js';
import { parsePagination } from '../utils/pagination.js';
import * as bookingService from '../services/bookingService.js';
import * as bookingRepository from '../repositories/bookingRepository.js';
import * as customerRepository from '../repositories/customerRepository.js';

export const create = asyncHandler(async (req, res) => {
  const isStaff = req.user.roles.some((r) => r !== 'Customer');
  const payload = { ...req.body, createdByUserId: req.user.id };

  if (!isStaff) {
    // Customers can only book for themselves and can never set price-affecting
    // or privileged fields -- backend recalculates price regardless (see
    // pricingService), this just prevents them from smuggling in a discount,
    // commission, agent, or an immediate-confirm bypass of the hold.
    delete payload.discountAmount;
    delete payload.commissionPercent;
    delete payload.agentId;
    delete payload.immediateConfirm;
    payload.source = 'website';

    // Never trust a customerId submitted by the caller -- resolve it from
    // their own account so one customer can never book (or be billed) under
    // another customer's profile.
    const own = await customerRepository.findByUserId(req.user.id);
    if (!own) throw new ValidationError('No customer profile is associated with this account');
    payload.customerId = own.id;
  } else if (!payload.customerId) {
    throw new ValidationError('customerId is required');
  }

  const booking = await bookingService.createBooking(payload);
  return created(res, booking, 'Booking created');
});

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { ...req.query };

  const isStaff = req.user.roles.some((r) => r !== 'Customer');
  if (!isStaff) {
    // Same self-scoping as getById below: a Customer with bookings.view can
    // only ever see their own bookings, regardless of what ?customerId= they pass.
    const own = await customerRepository.findByUserId(req.user.id);
    query.customerId = own ? own.id : '00000000-0000-0000-0000-000000000000';
  }

  const { items, total } = await bookingRepository.listBookings({ ...query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const booking = await bookingRepository.findBookingById(req.params.id);
  if (!booking) throw new NotFoundError('Booking not found');

  const isOwner = req.user.roles.includes('Customer') && booking.customer?.userId === req.user.id;
  const isStaff = req.user.roles.some((r) => r !== 'Customer');
  if (!isOwner && !isStaff) throw new AuthorizationError();

  return success(res, { data: booking });
});

export const cancel = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, {
    reason: req.body.reason,
    changedById: req.user.id,
  });
  return success(res, { data: booking, message: 'Booking cancelled' });
});

export const confirm = asyncHandler(async (req, res) => {
  const booking = await bookingService.confirmBookingAfterPayment(req.params.id, { changedById: req.user.id });
  return success(res, { data: booking, message: 'Booking confirmed' });
});

export const checkIn = asyncHandler(async (req, res) => {
  const booking = await bookingService.checkInBooking(req.params.id, { staffUserId: req.user.id, notes: req.body.notes });
  return success(res, { data: booking, message: 'Guest checked in' });
});

export const checkOut = asyncHandler(async (req, res) => {
  const booking = await bookingService.checkOutBooking(req.params.id, { staffUserId: req.user.id, notes: req.body.notes });
  return success(res, { data: booking, message: 'Guest checked out' });
});
