import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as roleController from '../controllers/roleController.js';
import { createRoleSchema, updateRolePermissionsSchema, idParamSchema } from '../validators/role.validators.js';

export const router = Router();

router.use(authenticate);

router.get('/', requirePermission('roles.view'), roleController.listRoles);
router.get('/permissions', requirePermission('roles.view'), roleController.listPermissions);
router.post('/', requirePermission('roles.create'), validate({ body: createRoleSchema }), roleController.createRole);
router.put(
  '/:id/permissions',
  requirePermission('roles.update'),
  validate({ params: idParamSchema, body: updateRolePermissionsSchema }),
  roleController.updateRolePermissions
);

export default router;
