/**
 * Demo accounts created by the seed (server/seeds/index.js) and shown on the
 * login page when IS_DEMO=true. Single source so the two cannot drift apart.
 * Change these passwords after seeding any real deployment.
 */
export const DEMO_SUPER_ADMIN = {
  label: 'Super admin',
  email: 'admin@example.com',
  password: 'Admin@12345',
};

export const DEMO_CUSTOMER = {
  label: 'Customer',
  email: 'customer@example.com',
  password: 'Customer@12345',
};

export const DEMO_ACCOUNTS = [DEMO_SUPER_ADMIN, DEMO_CUSTOMER];
