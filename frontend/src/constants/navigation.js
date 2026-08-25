// Sidebar nav config for the admin UI (instructions.md section 38) and a
// pure-function breadcrumb derivation used by AdminLayout's breadcrumb slot.
// `permission: null` means "visible to any authenticated user" (Dashboard, Settings);
// everything else is gated by the *.view permission for that resource.
export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: '\u{1F3E0}', permission: null },
  { label: 'Bookings', to: '/admin/bookings', icon: '\u{1F4D6}', permission: 'bookings.view' },
  { label: 'Hotels', to: '/admin/hotels', icon: '\u{1F3E8}', permission: 'hotels.view' },
  { label: 'Rooms', to: '/admin/rooms/room-types', icon: '\u{1F6CF}️', permission: 'room_types.view' },
  { label: 'Customers', to: '/admin/customers', icon: '\u{1F465}', permission: 'customers.view' },
  { label: 'Tours', to: '/admin/tours/packages', icon: '\u{1F9F3}', permission: 'tours.view' },
  { label: 'Destinations', to: '/admin/destinations', icon: '\u{1F4CD}', permission: 'destinations.view' },
  { label: 'Transport', to: '/admin/transport/vehicles', icon: '\u{1F690}', permission: 'transport.view' },
  { label: 'Payments', to: '/admin/payments', icon: '\u{1F4B3}', permission: 'payments.view' },
  { label: 'Invoices', to: '/admin/invoices', icon: '\u{1F9FE}', permission: 'invoices.view' },
  { label: 'Commissions', to: '/admin/commissions', icon: '\u{1F4B0}', permission: 'commissions.view' },
  { label: 'Reports', to: '/admin/reports', icon: '\u{1F4CA}', permission: 'reports.view' },
  { label: 'Users', to: '/admin/users', icon: '\u{1F9D1}‍\u{1F4BC}', permission: 'users.view' },
  { label: 'Roles & Permissions', to: '/admin/roles', icon: '\u{1F510}', permission: 'roles.view' },
  { label: 'Settings', to: '/admin/settings', icon: '⚙️', permission: null },
];

const SECTION_LABELS = {
  dashboard: 'Dashboard',
  bookings: 'Bookings',
  hotels: 'Hotels',
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
  return trail;
}
