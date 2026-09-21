'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { updateCommissionStatusSchema } from '../validators/commission.validators.js';
import * as commissionService from '../services/commissionService.js';

export async function updateCommissionAction(id, payload) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'commissions.update');
    return commissionService.updateCommissionStatus(id, parse('body', payload, updateCommissionStatusSchema), user.id);
  });
}

/** Matches commissionService.markAsPaid's client-side hardcoded payload -- see its comment. */
export async function markCommissionPaidAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'commissions.update');
    const payload = parse('body', { status: 'paid', paidAt: new Date().toISOString() }, updateCommissionStatusSchema);
    return commissionService.updateCommissionStatus(id, payload, user.id);
  });
}
