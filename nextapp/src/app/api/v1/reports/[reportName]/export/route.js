import { NextResponse } from 'next/server';
import { parseParams, parseQuery } from '../../../../../../server/lib/parseRequest.js';
import { generalLimit } from '../../../../../../server/lib/rateLimit.js';
import { withAuth } from '../../../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../../../server/middleware/withPermission.js';
import { AppError, NotFoundError } from '../../../../../../server/utils/errors.js';
import {
  reportNameParamSchema,
  reportExportQuerySchema,
} from '../../../../../../server/validators/report.validators.js';
import { getReportRunner } from '../../../../../../server/services/reportService.js';
import { toCsv } from '../../../../../../server/utils/csvExporter.js';

function extractFilters(query) {
  const { dateFrom, dateTo, hotelId, agentId, paymentMethod, bookingSource } = query;
  return { dateFrom, dateTo, hotelId, agentId, paymentMethod, bookingSource };
}

function requireRunner(reportName) {
  const runner = getReportRunner(reportName);
  if (!runner) throw new NotFoundError(`Unknown report: ${reportName}`);
  return runner;
}

/**
 * GET /reports/:reportName/export?format=csv -- streams the full filtered
 * dataset (ignores pagination) as text/csv. Bypasses apiHandler's JSON
 * wrapping the same way the PDF download route does, since this returns a
 * raw file, not the `{success, data, message}` envelope.
 */
export async function GET(request, ctx) {
  try {
    generalLimit(request, 'reports');
    const user = await withAuth(request);
    requirePermission(user, 'reports.export');
    const params = await ctx.params;
    const { reportName } = parseParams(params, reportNameParamSchema);
    const query = parseQuery(request, reportExportQuerySchema);

    const runner = requireRunner(reportName);
    const filters = extractFilters(query);

    const { rows } = await runner(filters);
    const csv = toCsv(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${reportName}-report.csv"`,
      },
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    const errors = err instanceof AppError ? err.errors : [];
    return NextResponse.json({ success: false, message, errors }, { status: statusCode });
  }
}
