import { asyncHandler } from '../utils/asyncHandler.js';
import { success, created, paginated } from '../utils/apiResponse.js';
import { parsePagination } from '../utils/pagination.js';
import { AuthorizationError } from '../utils/errors.js';
import * as invoiceService from '../services/invoiceService.js';
import * as customerRepository from '../repositories/customerRepository.js';

function isStaff(req) {
  return req.user.roles.some((r) => r !== 'Customer');
}

async function assertOwnsInvoice(req, invoice) {
  if (isStaff(req)) return;
  const own = await customerRepository.findByUserId(req.user.id);
  if (!own || invoice.booking?.customerId !== own.id) throw new AuthorizationError();
}

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const query = { ...req.query };

  if (!isStaff(req)) {
    const own = await customerRepository.findByUserId(req.user.id);
    query.customerId = own ? own.id : '00000000-0000-0000-0000-000000000000';
  }

  const { items, total } = await invoiceService.listInvoices({ ...query, page, limit, skip });
  return paginated(res, { items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoice(req.params.id);
  await assertOwnsInvoice(req, invoice);
  return success(res, { data: invoice });
});

export const create = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.generateInvoiceForBooking(req.body.bookingId, req.user.id);
  return created(res, invoice, 'Invoice generated');
});

export const getPdf = asyncHandler(async (req, res) => {
  const { buffer, invoice } = await invoiceService.getInvoicePdf(req.params.id);
  await assertOwnsInvoice(req, invoice);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(buffer);
});
