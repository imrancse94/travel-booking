import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as customerController from '../controllers/customerController.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
  customerHistoryQuerySchema,
  createCustomerDocumentSchema,
  idParamSchema,
  documentParamSchema,
} from '../validators/customer.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /customers/me:
 *   get:
 *     summary: Get the logged-in user's own customer profile
 *     tags: [Customers]
 *   put:
 *     summary: Update the logged-in user's own customer profile
 *     tags: [Customers]
 */
router.get('/me', customerController.getMe);
router.put('/me', validate({ body: updateCustomerSchema }), customerController.updateMe);

/**
 * @openapi
 * /customers:
 *   get:
 *     summary: List customers (paginated, searchable)
 *     tags: [Customers]
 *   post:
 *     summary: Create a customer profile
 *     tags: [Customers]
 */
router.get('/', requirePermission('customers.view'), validate({ query: listCustomersQuerySchema }), customerController.list);
router.post(
  '/',
  requirePermission('customers.create'),
  validate({ body: createCustomerSchema }),
  customerController.create
);

router.get('/:id', requirePermission('customers.view'), validate({ params: idParamSchema }), customerController.getById);
router.put(
  '/:id',
  requirePermission('customers.update'),
  validate({ params: idParamSchema, body: updateCustomerSchema }),
  customerController.update
);
router.delete('/:id', requirePermission('customers.delete'), validate({ params: idParamSchema }), customerController.remove);

// Booking / payment history (customer profile view)
router.get(
  '/:id/bookings',
  requirePermission('customers.view'),
  validate({ params: idParamSchema, query: customerHistoryQuerySchema }),
  customerController.bookingHistory
);
router.get(
  '/:id/payments',
  requirePermission('customers.view'),
  validate({ params: idParamSchema, query: customerHistoryQuerySchema }),
  customerController.paymentHistory
);

// Document metadata sub-resource (actual file storage lives in the uploads module)
router.get(
  '/:id/documents',
  requirePermission('customers.view'),
  validate({ params: idParamSchema }),
  customerController.listDocuments
);
router.post(
  '/:id/documents',
  requirePermission('customers.update'),
  validate({ params: idParamSchema, body: createCustomerDocumentSchema }),
  customerController.addDocument
);
router.delete(
  '/:id/documents/:documentId',
  requirePermission('customers.update'),
  validate({ params: documentParamSchema }),
  customerController.removeDocument
);

export default router;
