import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import { NotFoundError } from '../utils/errors.js';
import * as customerService from '../services/customerService.js';
import * as customerRepository from '../repositories/customerRepository.js';

// Self-service profile for the logged-in user, regardless of `customers.*`
// permissions -- every authenticated customer must be able to see/edit their
// own profile even though the admin `/customers/:id` routes are RBAC-gated.
export const getMe = asyncHandler(async (req, res) => {
  const customer = await customerRepository.findByUserId(req.user.id);
  if (!customer) throw new NotFoundError('No customer profile for this account');
  return success(res, { data: customer });
});

export const updateMe = asyncHandler(async (req, res) => {
  const customer = await customerRepository.findByUserId(req.user.id);
  if (!customer) throw new NotFoundError('No customer profile for this account');
  const updated = await customerService.updateCustomer(customer.id, req.body, req.user.id);
  return success(res, { data: updated, message: 'Profile updated' });
});

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await customerService.listCustomers({ ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomer(req.params.id);
  return success(res, { data: customer });
});

export const create = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body, req.user.id);
  return created(res, customer, 'Customer created');
});

export const update = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body, req.user.id);
  return success(res, { data: customer, message: 'Customer updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.params.id, req.user.id);
  return success(res, { message: 'Customer deleted' });
});

export const listDocuments = asyncHandler(async (req, res) => {
  const documents = await customerService.listDocuments(req.params.id);
  return success(res, { data: documents });
});

export const addDocument = asyncHandler(async (req, res) => {
  const document = await customerService.addDocument(req.params.id, req.body, req.user.id);
  return created(res, document, 'Document added');
});

export const removeDocument = asyncHandler(async (req, res) => {
  await customerService.removeDocument(req.params.id, req.params.documentId, req.user.id);
  return success(res, { message: 'Document removed' });
});

export const bookingHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await customerService.getBookingHistory(req.params.id, { ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const paymentHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await customerService.getPaymentHistory(req.params.id, { ...req.query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});
