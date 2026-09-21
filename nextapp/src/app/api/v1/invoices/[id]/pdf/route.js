import { NextResponse } from 'next/server';
import logger from '../../../../../../server/config/logger.js';
import { parseParams } from '../../../../../../server/lib/parseRequest.js';
import { generalLimit } from '../../../../../../server/lib/rateLimit.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { idParamSchema } from '../../../../../../server/validators/invoice.validators.js';
import * as invoiceService from '../../../../../../server/services/invoiceService.js';
import * as customerService from '../../../../../../server/services/customerService.js';
import { AppError, AuthorizationError } from '../../../../../../server/utils/errors.js';

function isStaff(user) {
  return user.roles.some((r) => r !== 'Customer');
}

async function assertOwnsInvoice(user, invoice) {
  if (isStaff(user)) return;
  const own = await customerService.findCustomerByUserId(user.id);
  if (!own || invoice.booking?.customerId !== own.id) throw new AuthorizationError();
}

/**
 * Returns the invoice as a raw application/pdf response instead of the usual
 * JSON envelope, so this bypasses apiHandler (which always wraps the result
 * as JSON via NextResponse.json) and builds the NextResponse directly.
 */
export async function GET(request, ctx) {
  try {
    generalLimit(request, 'invoices');
    const user = await withAuth(request);
    requirePermission(user, 'invoices.view');
    const params = await ctx.params;
    const { id } = parseParams(params, idParamSchema);

    const { buffer, invoice } = await invoiceService.getInvoicePdf(id);
    await assertOwnsInvoice(user, invoice);

    // The buffer above already holds everything the client needs, so the
    // copy getInvoicePdf just wrote to disk has no further purpose -- remove
    // it right away rather than leaving it (and its DB pdfUrl pointer)
    // behind after every download. Best-effort: a cleanup failure must not
    // turn a successful download into an error response.
    await invoiceService.deleteInvoicePdfFile(invoice).catch((err) => {
      logger.error({ err, invoiceId: invoice.id }, 'Failed to delete invoice PDF after download');
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    const errors = err instanceof AppError ? err.errors : [];
    return NextResponse.json({ success: false, message, errors }, { status: statusCode });
  }
}
