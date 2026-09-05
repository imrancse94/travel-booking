import { asyncHandler } from '../utils/asyncHandler.js';
import { paginated } from '../utils/apiResponse.js';
import { NotFoundError } from '../utils/errors.js';
import { parsePagination } from '../utils/pagination.js';
import { toCsv } from '../utils/csvExporter.js';
import { listAuditLogs as queryAuditLogs } from '../services/auditService.js';
import * as reportService from '../services/reportService.js';

function extractFilters(query) {
  const { dateFrom, dateTo, hotelId, agentId, paymentMethod, bookingSource } = query;
  return { dateFrom, dateTo, hotelId, agentId, paymentMethod, bookingSource };
}

function requireRunner(reportName) {
  const runner = reportService.getReportRunner(reportName);
  if (!runner) throw new NotFoundError(`Unknown report: ${reportName}`);
  return runner;
}

// GET /reports/:reportName -- paginated tabular rows for a data table.
export const runReport = asyncHandler(async (req, res) => {
  const runner = requireRunner(req.params.reportName);
  const { page, limit, skip } = parsePagination(req.query);
  const filters = extractFilters(req.query);

  const { rows, total } = await runner(filters, { skip, take: limit });
  return paginated(res, { items: rows, page, limit, total });
});

// GET /reports/:reportName/export?format=csv -- streams the full filtered
// dataset (ignores pagination) as text/csv.
export const exportReport = asyncHandler(async (req, res) => {
  const runner = requireRunner(req.params.reportName);
  const filters = extractFilters(req.query);

  const { rows } = await runner(filters);
  const csv = toCsv(rows);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.reportName}-report.csv"`);
  return res.status(200).send(csv);
});

// GET /reports/audit-logs -- paginated audit trail with entity/user/date filters.
export const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { entity, entityId, userId, dateFrom, dateTo } = req.query;

  const { items, total } = await queryAuditLogs({ entity, entityId, userId, dateFrom, dateTo, limit, skip });

  return paginated(res, { items, page, limit, total });
});
