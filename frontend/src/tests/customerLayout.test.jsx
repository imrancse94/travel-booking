import { screen } from '@testing-library/react';
import { CustomerLayout } from '../layouts/CustomerLayout.jsx';
import { renderWithProviders, CUSTOMER_USER, AGENT_USER, SUPER_ADMIN_USER } from './testUtils.jsx';

function renderLayout(options) {
  return renderWithProviders(
    <CustomerLayout>
      <h1>Home page</h1>
    </CustomerLayout>,
    options
  );
}

describe('Customer layout header', () => {
  it('offers sign in / register to an anonymous visitor', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: /^admin$/i })).not.toBeInTheDocument();
  });

  it("shows a signed-in customer their own pages but no admin link", () => {
    renderLayout({ user: CUSTOMER_USER });

    expect(screen.getByRole('link', { name: /my bookings/i })).toHaveAttribute('href', '/my-bookings');
    expect(screen.getByRole('link', { name: /my invoices/i })).toHaveAttribute('href', '/my-invoices');
    expect(screen.queryByRole('link', { name: /^admin$/i })).not.toBeInTheDocument();
  });

  it('links staff across to the admin console', () => {
    renderLayout({ user: AGENT_USER });
    expect(screen.getByRole('link', { name: /^admin$/i })).toHaveAttribute('href', '/admin');
  });

  it('links a Super Admin across to the admin console', () => {
    renderLayout({ user: SUPER_ADMIN_USER });
    expect(screen.getByRole('link', { name: /^admin$/i })).toHaveAttribute('href', '/admin');
  });
});
