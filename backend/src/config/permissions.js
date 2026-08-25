// Canonical list of granular RBAC permissions and the default roles that ship with the system.
// Used by the seed script (seeds/) and referenced by route guards (middleware/rbac.js).

export const PERMISSIONS = [
  // users
  'users.view', 'users.create', 'users.update', 'users.delete',
  // roles
  'roles.view', 'roles.create', 'roles.update', 'roles.delete',
  // hotels
  'hotels.view', 'hotels.create', 'hotels.update', 'hotels.delete',
  // rooms
  'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete',
  'room_types.view', 'room_types.create', 'room_types.update', 'room_types.delete',
  'amenities.view', 'amenities.create', 'amenities.update', 'amenities.delete',
  'rate_plans.view', 'rate_plans.create', 'rate_plans.update', 'rate_plans.delete',
  // bookings
  'bookings.view', 'bookings.create', 'bookings.update', 'bookings.cancel', 'bookings.confirm', 'bookings.checkin', 'bookings.checkout',
  // customers
  'customers.view', 'customers.create', 'customers.update', 'customers.delete',
  // services
  'services.view', 'services.create', 'services.update', 'services.delete',
  // payments
  'payments.view', 'payments.create', 'payments.refund',
  // invoices
  'invoices.view', 'invoices.create',
  // commissions
  'commissions.view', 'commissions.create', 'commissions.update',
  // travel
  'destinations.view', 'destinations.create', 'destinations.update', 'destinations.delete',
  'tours.view', 'tours.create', 'tours.update', 'tours.delete',
  'tour_bookings.view', 'tour_bookings.create', 'tour_bookings.update',
  'transport.view', 'transport.create', 'transport.update', 'transport.delete',
  // reporting
  'reports.view', 'reports.export',
  'dashboard.view',
  'audit_logs.view',
  // notifications / settings
  'notifications.view', 'notifications.manage',
  'settings.view', 'settings.update',
  'uploads.create',
];

export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  AGENCY_ADMIN: 'Agency Admin',
  HOTEL_ADMIN: 'Hotel Admin',
  BOOKING_AGENT: 'Booking Agent',
  ACCOUNTANT: 'Accountant',
  TOUR_MANAGER: 'Tour Manager',
  CUSTOMER: 'Customer',
};

// Super Admin implicitly bypasses all permission checks (see middleware/rbac.js) and is not listed here.
export const ROLE_PERMISSIONS = {
  [ROLES.AGENCY_ADMIN]: PERMISSIONS.filter((p) => !p.startsWith('audit_logs')),
  [ROLES.HOTEL_ADMIN]: [
    'hotels.view', 'hotels.update',
    'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete',
    'room_types.view', 'room_types.create', 'room_types.update', 'room_types.delete',
    'amenities.view', 'amenities.create', 'amenities.update',
    'rate_plans.view', 'rate_plans.create', 'rate_plans.update', 'rate_plans.delete',
    'bookings.view', 'bookings.update', 'bookings.confirm', 'bookings.checkin', 'bookings.checkout', 'bookings.cancel',
    'customers.view',
    'services.view', 'services.create', 'services.update',
    'payments.view',
    'invoices.view',
    'reports.view',
    'dashboard.view',
    'notifications.view',
  ],
  [ROLES.BOOKING_AGENT]: [
    'hotels.view', 'rooms.view', 'room_types.view', 'amenities.view', 'rate_plans.view',
    'bookings.view', 'bookings.create', 'bookings.update', 'bookings.cancel',
    'customers.view', 'customers.create', 'customers.update',
    'services.view',
    'payments.view', 'payments.create',
    'invoices.view', 'invoices.create',
    'commissions.view',
    'destinations.view', 'tours.view', 'tour_bookings.view', 'tour_bookings.create',
    'transport.view', 'transport.create',
    'dashboard.view', 'notifications.view',
  ],
  [ROLES.ACCOUNTANT]: [
    'bookings.view',
    'payments.view', 'payments.create', 'payments.refund',
    'invoices.view', 'invoices.create',
    'commissions.view', 'commissions.update',
    'reports.view', 'reports.export',
    'dashboard.view', 'audit_logs.view', 'notifications.view',
  ],
  [ROLES.TOUR_MANAGER]: [
    'destinations.view', 'destinations.create', 'destinations.update',
    'tours.view', 'tours.create', 'tours.update', 'tours.delete',
    'tour_bookings.view', 'tour_bookings.create', 'tour_bookings.update',
    'transport.view', 'transport.create', 'transport.update',
    'customers.view',
    'dashboard.view', 'notifications.view',
  ],
  [ROLES.CUSTOMER]: [
    'bookings.view', 'bookings.create', 'bookings.cancel',
    'tour_bookings.view', 'tour_bookings.create',
    'invoices.view', 'payments.create', 'payments.view',
    'notifications.view',
  ],
};
