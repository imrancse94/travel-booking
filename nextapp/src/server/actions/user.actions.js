'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validators.js';
import * as userService from '../services/userService.js';

export async function saveUserAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'users.update' : 'users.create');

    return id
      ? userService.updateUser(id, parse('body', payload, updateUserSchema), user.id)
      : userService.createUser(parse('body', payload, createUserSchema), user.id);
  });
}

export async function deleteUserAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'users.delete');
    await userService.deleteUser(id, user.id);
    return null;
  });
}
