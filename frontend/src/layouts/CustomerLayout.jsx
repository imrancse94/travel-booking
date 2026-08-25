import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Button } from '../components/ui/index.js';
import '../styles/customer-pages.css';
import './CustomerLayout.css';

const NAV_LINKS = [{ to: '/hotels', label: 'Hotels' }];

const AUTHED_LINKS = [
  { to: '/my-bookings', label: 'My Bookings' },
  { to: '/my-invoices', label: 'My Invoices' },
  { to: '/profile', label: 'Profile' },
];

/** Shell for every customer-facing page: header (brand, nav, auth state) + footer. Nested pages render through <Outlet/>. */
export function CustomerLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  }

  return (
    <div className="customer-layout">
      <header className="customer-header">
        <div className="customer-header__inner container">
          <NavLink to="/" className="customer-header__brand" onClick={() => setMenuOpen(false)}>
            Global Travel Agency
          </NavLink>

          <button
            type="button"
            className="customer-header__hamburger"
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={`customer-header__nav ${menuOpen ? 'customer-header__nav--open' : ''}`}>
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className="customer-header__link" onClick={() => setMenuOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated &&
              AUTHED_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} className="customer-header__link" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </NavLink>
              ))}

            <div className="customer-header__auth">
              {isAuthenticated ? (
                <>
                  <span className="customer-header__user">{user?.firstName || user?.email}</span>
                  <Button variant="secondary" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button as={NavLink} variant="ghost" to="/login" onClick={() => setMenuOpen(false)}>
                    Sign In
                  </Button>
                  <Button as={NavLink} to="/register" onClick={() => setMenuOpen(false)}>
                    Register
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="customer-main">
        <Outlet />
      </main>

      <footer className="customer-footer">
        <div className="container customer-footer__inner">
          <p>&copy; {new Date().getFullYear()} Global Travel Agency. All rights reserved.</p>
          <p className="text-muted">Hotel booking and travel packages, all in one place.</p>
        </div>
      </footer>
    </div>
  );
}

export default CustomerLayout;
