'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validators.js';
import * as customerService from '../services/customerService.js';

/** Self-service profile edit -- no extra permission check, matches customers/me/route.js's PUT (auth only). */
export async function updateMyProfileAction(payload) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    return customerService.updateMyProfile(user.id, parse('body', payload, updateCustomerSchema));
  });
}

export async function saveCustomerAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'customers.update' : 'customers.create');

    return id
      ? customerService.updateCustomer(id, parse('body', payload, updateCustomerSchema), user.id)
      : customerService.createCustomer(parse('body', payload, createCustomerSchema), user.id);
  });
}

export async function deleteCustomerAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'customers.delete');
    await customerService.deleteCustomer(id, user.id);
    return null;
  });
}
