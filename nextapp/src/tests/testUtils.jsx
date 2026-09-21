import { render } from '@testing-library/react';
import { SessionProvider, useAuth } from '../contexts/AuthContext.jsx';
import { ToastProvider } from '../components/ui/index.js';
import { routerMock, setNavigation } from './navigationMock.js';

export { routerMock, setNavigation };

/**
 * Shared render helper for component tests.
 *
 * Note this deliberately does NOT wrap in <AuthProvider>: that component's
 * only job is to dispatch bootstrapSession() (a network round-trip) on mount,
 * which would immediately overwrite any session we preload here. Tests seed
 * `state.auth` directly instead -- the same shape bootstrapSession produces --
 * so useAuth()/ProtectedRoute see a logged-in (or logged-out) user without
 * any HTTP mocking.
 */

export const CUSTOMER_USER = {
  id: 'user-customer',
  email: 'customer@example.com',
  firstName: 'Casey',
  lastName: 'Customer',
  roles: ['Customer'],
  permissions: [],
};

export const AGENT_USER = {
  id: 'user-agent',
  email: 'agent@example.com',
  firstName: 'Ada',
  lastName: 'Agent',
  roles: ['Booking Agent'],
  permissions: ['bookings.view', 'customers.view'],
};

export const SUPER_ADMIN_USER = {
  id: 'user-admin',
  email: 'admin@example.com',
  firstName: 'Sam',
  lastName: 'Admin',
  // Super Admin holds every permission implicitly (see useAuth().hasPermission),
  // so the explicit list is intentionally empty.
  roles: ['Super Admin'],
  permissions: [],
};

/**
 * `pathname`/`search`/`params` set what next/navigation reports to the tree,
 * replacing what <MemoryRouter initialEntries> used to express. Assert
 * navigation through the returned `router` spies.
 */
/** Reports the live session so tests can assert on it after a sign-in. */
function SessionProbe({ onChange }) {
  const { user } = useAuth();
  onChange(user);
  return null;
}

export function renderWithProviders(
  ui,
  { user = null, pathname = '/', search = '', params = {} } = {}
) {
  setNavigation({ pathname, search, params });

  // The server resolves the session and passes it down, so a test supplies it
  // the same way rather than seeding a store.
  let current = user;
  const getUser = () => current;

  function Wrapper({ children }) {
    return (
      <SessionProvider session={user}>
        <ToastProvider>
          <SessionProbe onChange={(u) => { current = u; }} />
          {children}
        </ToastProvider>
      </SessionProvider>
    );
  }

  return { getUser, router: routerMock, ...render(ui, { wrapper: Wrapper }) };
}
