import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as roomController from '../controllers/roomController.js';
import { createRoomSchema, updateRoomSchema, listRoomsQuerySchema, idParamSchema } from '../validators/room.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /rooms:
 *   get:
 *     summary: List rooms (paginated; filter by hotelId/roomTypeId/status/search)
 *     tags: [Rooms]
 *   post:
 *     summary: Create a room
 *     tags: [Rooms]
 */
router.get('/', requirePermission('rooms.view'), validate({ query: listRoomsQuerySchema }), roomController.list);
router.post('/', requirePermission('rooms.create'), validate({ body: createRoomSchema }), roomController.create);

/**
 * @openapi
 * /rooms/{id}:
 *   get:
 *     summary: Get room details
 *     tags: [Rooms]
 *   put:
 *     summary: Update a room (moving to maintenance/inactive is blocked if the room has an active booking)
 *     tags: [Rooms]
 *   delete:
 *     summary: Soft-delete a room (blocked if the room has an active booking)
 *     tags: [Rooms]
 */
router.get('/:id', requirePermission('rooms.view'), validate({ params: idParamSchema }), roomController.getById);
router.put(
  '/:id',
  requirePermission('rooms.update'),
  validate({ params: idParamSchema, body: updateRoomSchema }),
  roomController.update
);
router.delete('/:id', requirePermission('rooms.delete'), validate({ params: idParamSchema }), roomController.remove);

export default router;
