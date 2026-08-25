import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as invoiceController from '../controllers/invoiceController.js';
import { createInvoiceSchema, listInvoicesQuerySchema, idParamSchema } from '../validators/invoice.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /invoices:
 *   get:
 *     summary: List invoices (paginated, filterable)
 *     tags: [Invoices]
 *   post:
 *     summary: Generate an invoice from a booking's stored amounts
 *     tags: [Invoices]
 */
router.get('/', requirePermission('invoices.view'), validate({ query: listInvoicesQuerySchema }), invoiceController.list);
router.post(
  '/',
  requirePermission('invoices.create'),
  validate({ body: createInvoiceSchema }),
  invoiceController.create
);

router.get('/:id', requirePermission('invoices.view'), validate({ params: idParamSchema }), invoiceController.getById);
router.get(
  '/:id/pdf',
  requirePermission('invoices.view'),
  validate({ params: idParamSchema }),
  invoiceController.getPdf
);

export default router;
