import { screen, waitFor } from '@testing-library/react';
import AuthGate from '../components/auth/AuthGate.jsx';
import PermissionGate from '../components/auth/PermissionGate.jsx';
import { renderWithProviders, CUSTOMER_USER, AGENT_USER, SUPER_ADMIN_USER } from './testUtils.jsx';

/**
 * Replaces protectedRoute.test.jsx. <ProtectedRoute> was a route element, so
 * those tests could assert which route rendered. The App Router splits the same
 * job across two components -- AuthGate in a layout, PermissionGate around each
 * admin page -- and a denied visit is a router.replace() rather than a
 * different route rendering, so that is what these assert.
 *
 * There is no longer a "session restoring" case to cover: the server resolves
 * the session from the request cookies before any component renders, so these
 * gates never see an unknown user. middleware.js is the first line of defence
 * for protected routes; these components are the in-render backstop.
 */

function Guarded() {
  return <h1>Checkout page</h1>;
}

describe('AuthGate', () => {
  it('sends an anonymous visitor to login, remembering where they were', async () => {
    const { router } = renderWithProviders(
      <AuthGate>
        <Guarded />
      </AuthGate>,
      { pathname: '/checkout' }
    );

    expect(screen.queryByRole('heading', { name: /checkout page/i })).not.toBeInTheDocument();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login?from=%2Fcheckout'));
  });

  it('keeps the query string in the return path', async () => {
    const { router } = renderWithProviders(
      <AuthGate>
        <Guarded />
      </AuthGate>,
      { pathname: '/hotels/hotel-1', search: '?checkIn=2026-09-10' }
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    expect(decodeURIComponent(router.replace.mock.calls[0][0])).toBe('/login?from=/hotels/hotel-1?checkIn=2026-09-10');
  });

  it('renders the page for an authenticated user', () => {
    const { router } = renderWithProviders(
      <AuthGate>
        <Guarded />
      </AuthGate>,
      { user: CUSTOMER_USER, pathname: '/checkout' }
    );

    expect(screen.getByRole('heading', { name: /checkout page/i })).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

});

describe('PermissionGate', () => {
  function renderGate(props, options) {
    return renderWithProviders(
      <PermissionGate {...props}>
        <h1>Bookings page</h1>
      </PermissionGate>,
      options
    );
  }

  it('redirects an authenticated user who lacks the required permission', async () => {
    const { router } = renderGate({ permission: 'bookings.view' }, { user: CUSTOMER_USER });

    expect(screen.queryByRole('heading', { name: /bookings page/i })).not.toBeInTheDocument();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('renders the page when the user holds the required permission', () => {
    const { router } = renderGate({ permission: 'bookings.view' }, { user: AGENT_USER });

    expect(screen.getByRole('heading', { name: /bookings page/i })).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('treats Super Admin as holding every permission', () => {
    renderGate({ permission: 'bookings.view' }, { user: SUPER_ADMIN_USER });

    expect(screen.getByRole('heading', { name: /bookings page/i })).toBeInTheDocument();
  });

  it('enforces role gating', async () => {
    const denied = renderGate({ role: 'Super Admin' }, { user: AGENT_USER });
    expect(screen.queryByRole('heading', { name: /bookings page/i })).not.toBeInTheDocument();
    await waitFor(() => expect(denied.router.replace).toHaveBeenCalledWith('/'));

    denied.unmount();

    renderGate({ role: 'Super Admin' }, { user: SUPER_ADMIN_USER });
    expect(screen.getByRole('heading', { name: /bookings page/i })).toBeInTheDocument();
  });
});
