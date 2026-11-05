// Sidebar nav config (`icon` is a Material Symbols name, rendered by <Icon />) for the admin UI (instructions.md section 38) and a
// pure-function breadcrumb derivation used by AdminLayout's breadcrumb slot.
// `permission: null` means "visible to any authenticated user" (Dashboard, Settings);
// everything else is gated by the *.view permission for that resource.
export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard', permission: null },
  { label: 'Bookings', to: '/admin/bookings', icon: 'menu_book', permission: 'bookings.view' },
  { label: 'Hotels', to: '/admin/hotels', icon: 'hotel', permission: 'hotels.view' },
  { label: 'Services', to: '/admin/services', icon: 'room_service', permission: 'services.view' },
  { label: 'Rooms', to: '/admin/rooms/room-types', icon: 'bed', permission: 'room_types.view' },
  { label: 'Customers', to: '/admin/customers', icon: 'groups', permission: 'customers.view' },
  { label: 'Tours', to: '/admin/tours/packages', icon: 'luggage', permission: 'tours.view' },
  { label: 'Destinations', to: '/admin/destinations', icon: 'location_on', permission: 'destinations.view' },
  { label: 'Transport', to: '/admin/transport/vehicles', icon: 'directions_bus', permission: 'transport.view' },
  { label: 'Payments', to: '/admin/payments', icon: 'credit_card', permission: 'payments.view' },
  { label: 'Invoices', to: '/admin/invoices', icon: 'receipt_long', permission: 'invoices.view' },
  { label: 'Commissions', to: '/admin/commissions', icon: 'payments', permission: 'commissions.view' },
  { label: 'Reports', to: '/admin/reports', icon: 'bar_chart', permission: 'reports.view' },
  { label: 'Users', to: '/admin/users', icon: 'manage_accounts', permission: 'users.view' },
  { label: 'Roles & Permissions', to: '/admin/roles', icon: 'admin_panel_settings', permission: 'roles.view' },
  { label: 'Activity Logs', to: '/admin/activity-logs', icon: 'history', permission: 'activity_logs.view' },
  { label: 'Settings', to: '/admin/settings', icon: 'settings', permission: null },
  // `role` limits an item to that role (checked in AdminLayout; the page itself
  // enforces the same rule on the server).
  { label: 'Environment', to: '/admin/environment', icon: 'science', permission: null, role: 'Super Admin' },
];

const SECTION_LABELS = {
  dashboard: 'Dashboard',
  bookings: 'Bookings',
  hotels: 'Hotels',
  services: 'Extra Services',
  rooms: 'Rooms',
  'room-types': 'Room Types',
  'rate-plans': 'Rate Plans',
  customers: 'Customers',
  tours: 'Tours',
  packages: 'Tour Packages',
  destinations: 'Destinations',
  transport: 'Transport',
  vehicles: 'Vehicles',
  drivers: 'Drivers',
  payments: 'Payments',
  invoices: 'Invoices',
  commissions: 'Commissions',
  reports: 'Reports',
  users: 'Users',
  roles: 'Roles & Permissions',
  settings: 'Settings',
  'activity-logs': 'Activity Logs',
  environment: 'Environment',
  new: 'New',
  edit: 'Edit',
};

function humanize(segment) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return 'Details';
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Pure derivation of a breadcrumb trail from the current /admin/* pathname -- no page-level wiring required. */
export function getBreadcrumbTrail(pathname) {
  const segments = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
  if (segments.length === 0) return [{ label: 'Dashboard' }];

  const trail = [{ label: 'Dashboard', to: '/admin/dashboard' }];
  let cumulative = '/admin';
  segments.forEach((seg, i) => {
    cumulative += `/${seg}`;
    const isLast = i === segments.length - 1;
    const label = SECTION_LABELS[seg] || humanize(seg);
    trail.push(isLast ? { label } : { label, to: cumulative });
  });

  // Some paths repeat a label: /admin/dashboard is the Dashboard root followed
  // by the Dashboard segment, and /admin/rooms/rooms is the Rooms section
  // followed by the Rooms page. Both rendered "Dashboard / Dashboard" and
  // tripped React's duplicate-key warning. Keep the LATER entry of any
  // consecutive pair, since the last item is the current page and correctly
  // carries no link.
  return trail.filter((item, i) => item.label !== trail[i + 1]?.label);
}
