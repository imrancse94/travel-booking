import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../routes/ProtectedRoute.jsx';
import { renderWithProviders, CUSTOMER_USER, AGENT_USER, SUPER_ADMIN_USER } from './testUtils.jsx';

function renderRoutes(options) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<h1>Home page</h1>} />
      <Route path="/login" element={<h1>Login page</h1>} />

      <Route element={<ProtectedRoute />}>
        <Route path="/checkout" element={<h1>Checkout page</h1>} />
      </Route>

      <Route element={<ProtectedRoute permission="bookings.view" />}>
        <Route path="/admin/bookings" element={<h1>Bookings page</h1>} />
      </Route>

      <Route element={<ProtectedRoute role="Super Admin" />}>
        <Route path="/admin/roles" element={<h1>Roles page</h1>} />
      </Route>
    </Routes>,
    options
  );
}

describe('ProtectedRoute', () => {
  it('sends an anonymous visitor to the login page', () => {
    renderRoutes({ initialEntries: ['/checkout'] });

    expect(screen.getByRole('heading', { name: /login page/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /checkout page/i })).not.toBeInTheDocument();
  });

  it('renders the route for an authenticated user', () => {
    renderRoutes({ user: CUSTOMER_USER, initialEntries: ['/checkout'] });

    expect(screen.getByRole('heading', { name: /checkout page/i })).toBeInTheDocument();
  });

  it('renders nothing while the session is still being restored', () => {
    renderRoutes({ isLoading: true, initialEntries: ['/checkout'] });

    // Neither the guarded page nor a premature redirect to /login: the guard
    // waits for bootstrapSession() to settle first.
    expect(screen.queryByRole('heading', { name: /checkout page/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /login page/i })).not.toBeInTheDocument();
  });

  it('redirects an authenticated user who lacks the required permission', () => {
    renderRoutes({ user: CUSTOMER_USER, initialEntries: ['/admin/bookings'] });

    expect(screen.getByRole('heading', { name: /home page/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /bookings page/i })).not.toBeInTheDocument();
  });

  it('renders the route when the user holds the required permission', () => {
    renderRoutes({ user: AGENT_USER, initialEntries: ['/admin/bookings'] });

    expect(screen.getByRole('heading', { name: /bookings page/i })).toBeInTheDocument();
  });

  it('treats Super Admin as holding every permission', () => {
    renderRoutes({ user: SUPER_ADMIN_USER, initialEntries: ['/admin/bookings'] });

    expect(screen.getByRole('heading', { name: /bookings page/i })).toBeInTheDocument();
  });

  it('enforces role-gated routes', () => {
    renderRoutes({ user: AGENT_USER, initialEntries: ['/admin/roles'] });
    expect(screen.getByRole('heading', { name: /home page/i })).toBeInTheDocument();

    renderRoutes({ user: SUPER_ADMIN_USER, initialEntries: ['/admin/roles'] });
    expect(screen.getByRole('heading', { name: /roles page/i })).toBeInTheDocument();
  });
});
