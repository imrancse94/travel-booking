'use server';

import { withActionResult } from './_actionResult.js';
import { requireActionUser } from './_actionAuth.js';
import { requirePermission } from '../middleware/withPermission.js';
import { parse } from '../lib/parseRequest.js';
import { createRoomSchema, updateRoomSchema } from '../validators/room.validators.js';
import * as roomService from '../services/roomService.js';

export async function saveRoomAction({ id, payload }) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, id ? 'rooms.update' : 'rooms.create');

    return id
      ? roomService.updateRoom(id, parse('body', payload, updateRoomSchema), user.id)
      : roomService.createRoom(parse('body', payload, createRoomSchema), user.id);
  });
}

export async function deleteRoomAction(id) {
  return withActionResult(async () => {
    const user = await requireActionUser();
    requirePermission(user, 'rooms.delete');
    await roomService.deleteRoom(id, user.id);
    return null;
  });
}
