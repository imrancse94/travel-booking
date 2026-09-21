import { apiHandler } from '../../../../../server/lib/apiHandler.js';
import { parseParams, parseQuery } from '../../../../../server/lib/parseRequest.js';
import { generalLimit } from '../../../../../server/lib/rateLimit.js';
import { paginated } from '../../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../server/middleware/withPermission.js';
import { parsePagination } from '../../../../../server/utils/pagination.js';
import { NotFoundError } from '../../../../../server/utils/errors.js';
import {
  reportNameParamSchema,
  reportQuerySchema,
} from '../../../../../server/validators/report.validators.js';
import { getReportRunner } from '../../../../../server/services/reportService.js';

function extractFilters(query) {
  const { dateFrom, dateTo, hotelId, agentId, paymentMethod, bookingSource } = query;
  return { dateFrom, dateTo, hotelId, agentId, paymentMethod, bookingSource };
}

function requireRunner(reportName) {
  const runner = getReportRunner(reportName);
  if (!runner) throw new NotFoundError(`Unknown report: ${reportName}`);
  return runner;
}

// GET /reports/:reportName -- paginated tabular rows for a data table.
export const GET = apiHandler(async (request, ctx) => {
  generalLimit(request, 'reports');
  const user = await withAuth(request);
  requirePermission(user, 'reports.view');
  const params = await ctx.params;
  const { reportName } = parseParams(params, reportNameParamSchema);
  const query = parseQuery(request, reportQuerySchema);
  const { page, limit, skip } = parsePagination(query);

  const runner = requireRunner(reportName);
  const filters = extractFilters(query);

  const { rows, total } = await runner(filters, { skip, take: limit });
  return paginated({ items: rows, page, limit, total });
});
