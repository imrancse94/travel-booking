import { apiHandler } from '../../../../server/lib/apiHandler.js';
import { parseQuery } from '../../../../server/lib/parseRequest.js';
import { success } from '../../../../server/lib/apiResponse.js';
import { withAuth } from '../../../../server/middleware/withAuth.js';
import { requirePermission } from '../../../../server/middleware/withPermission.js';
import { dashboardQuerySchema } from '../../../../server/validators/dashboard.validators.js';
import * as dashboardService from '../../../../server/services/dashboardService.js';

const STAFF_ONLY_ROLES = ['Super Admin', 'Agency Admin'];

function resolveView(user, query) {
  if (query.view) return query.view;

  const { roles } = user;
  const isSeniorStaff = roles.some((r) => STAFF_ONLY_ROLES.includes(r));
  if (!isSeniorStaff && roles.includes('Booking Agent')) return 'agent';
  if (!isSeniorStaff && roles.includes('Hotel Admin')) return 'hotel';
  return 'admin';
}

export const GET = apiHandler(async (request) => {
  const user = await withAuth(request);
  requirePermission(user, 'dashboard.view');
  const query = parseQuery(request, dashboardQuerySchema);
  const view = resolveView(user, query);

  let data;
  if (view === 'agent') {
    data = await dashboardService.getAgentDashboard(user.id);
  } else if (view === 'hotel') {
    data = await dashboardService.getHotelDashboard({ hotelId: query.hotelId });
  } else {
    data = await dashboardService.getAdminDashboard();
  }

  return success({ data: { view, ...data } });
});
