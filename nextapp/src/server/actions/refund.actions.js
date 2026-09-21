'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createRefundSchema } from '../validators/refund.validators.js';
import * as refundService from '../services/refundService.js';

/**
 * Only a create exists here -- refundService.js has no update/edit function
 * and the Route Handler at app/api/v1/refunds/[id]/route.js only exposes GET,
 * no PUT. There is nothing to convert for "update", so this action file
 * covers create only.
 */
export async function createRefundAction(payload) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'payments.refund');
    return refundService.refundPayment(parse('body', payload, createRefundSchema), user.id);
  });
}
