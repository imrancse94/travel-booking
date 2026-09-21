'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createInvoiceSchema } from '../validators/invoice.validators.js';
import * as invoiceService from '../services/invoiceService.js';

export async function createInvoiceAction(payload) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'invoices.create');
    const { bookingId } = parse('body', payload, createInvoiceSchema);
    return invoiceService.generateInvoiceForBooking(bookingId, user.id);
  });
}
