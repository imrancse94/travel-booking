import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import * as dashboardService from '../services/dashboardService.js';

const STAFF_ONLY_ROLES = ['Super Admin', 'Agency Admin'];

// GET /dashboard?view=admin|hotel|agent&hotelId=...
//
// `view` picks which dashboard shape to compute. When omitted it is inferred
// from the caller's roles: a plain Booking Agent gets the agent view, a plain
// Hotel Admin gets the hotel view (optionally further scoped with
// `?hotelId=`), everyone else (Super Admin/Agency Admin/Accountant/Tour
// Manager) gets the admin view. `?view=` lets a caller override this, e.g. a
// Super Admin checking a single hotel's dashboard.
function resolveView(req) {
  if (req.query.view) return req.query.view;

  const { roles } = req.user;
  const isSeniorStaff = roles.some((r) => STAFF_ONLY_ROLES.includes(r));
  if (!isSeniorStaff && roles.includes('Booking Agent')) return 'agent';
  if (!isSeniorStaff && roles.includes('Hotel Admin')) return 'hotel';
  return 'admin';
}

export const getDashboard = asyncHandler(async (req, res) => {
  const view = resolveView(req);

  let data;
  if (view === 'agent') {
    data = await dashboardService.getAgentDashboard(req.user.id);
  } else if (view === 'hotel') {
    data = await dashboardService.getHotelDashboard({ hotelId: req.query.hotelId });
  } else {
    data = await dashboardService.getAdminDashboard();
  }

  return success(res, { data: { view, ...data } });
});
