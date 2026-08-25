import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import { AuthorizationError } from '../utils/errors.js';
import * as refundService from '../services/refundService.js';
import * as customerRepository from '../repositories/customerRepository.js';

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

  const { items, total } = await refundService.listRefunds({ ...query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const refund = await refundService.getRefund(req.params.id);

  if (!isStaff(req)) {
    const own = await customerRepository.findByUserId(req.user.id);
    if (!own || refund.payment?.booking?.customerId !== own.id) throw new AuthorizationError();
  }

  return success(res, { data: refund });
});

export const create = asyncHandler(async (req, res) => {
  const refund = await refundService.refundPayment(req.body, req.user.id);
  return created(res, refund, 'Refund processed');
});
