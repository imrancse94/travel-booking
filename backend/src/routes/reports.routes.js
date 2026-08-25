import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import * as reportController from '../controllers/reportController.js';
import {
  reportNameParamSchema,
  reportQuerySchema,
  reportExportQuerySchema,
  auditLogQuerySchema,
} from '../validators/report.validators.js';

export const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /reports/audit-logs:
 *   get:
 *     summary: Paginated audit trail (filter by entity, entityId, userId, dateFrom/dateTo)
 *     tags: [Reports]
 */
// Registered before `/:reportName` so it isn't swallowed by that param route.
router.get(
  '/audit-logs',
  requirePermission('audit_logs.view'),
  validate({ query: auditLogQuerySchema }),
  reportController.listAuditLogs
);

/**
 * @openapi
 * /reports/{reportName}/export:
 *   get:
 *     summary: Export a report as CSV
 *     tags: [Reports]
 */
router.get(
  '/:reportName/export',
  requirePermission('reports.export'),
  validate({ params: reportNameParamSchema, query: reportExportQuerySchema }),
  reportController.exportReport
);

/**
 * @openapi
 * /reports/{reportName}:
 *   get:
 *     summary: Paginated tabular report (bookings, occupancy, revenue, customers, payments, refunds, commissions, hotels, tours, destinations)
 *     tags: [Reports]
 */
router.get(
  '/:reportName',
  requirePermission('reports.view'),
  validate({ params: reportNameParamSchema, query: reportQuerySchema }),
  reportController.runReport
);

export default router;
