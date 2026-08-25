import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as userController from '../controllers/userController.js';
import { createUserSchema, updateUserSchema, listUsersQuerySchema, idParamSchema } from '../validators/user.validators.js';

export const router = Router();

router.use(authenticate);

router.get('/', requirePermission('users.view'), validate({ query: listUsersQuerySchema }), userController.list);
router.post('/', requirePermission('users.create'), validate({ body: createUserSchema }), userController.create);
router.get('/:id', requirePermission('users.view'), validate({ params: idParamSchema }), userController.getById);
router.put(
  '/:id',
  requirePermission('users.update'),
  validate({ params: idParamSchema, body: updateUserSchema }),
  userController.update
);
router.delete('/:id', requirePermission('users.delete'), validate({ params: idParamSchema }), userController.remove);

export default router;
