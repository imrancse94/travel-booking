'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useBranding } from '../contexts/BrandingContext.jsx';
import { BrandMark, Button } from '../components/ui/index.js';
import '../styles/customer-pages.css';
import './CustomerLayout.css';

const NAV_LINKS = [{ to: '/hotels', label: 'Hotels' }];

const AUTHED_LINKS = [
  { to: '/my-bookings', label: 'My Bookings' },
  { to: '/my-invoices', label: 'My Invoices' },
  { to: '/profile', label: 'Profile' },
];

/** Shell for every customer-facing page: header (brand, nav, auth state) + footer. Nested pages render as {children}. */
export function CustomerLayout({ children }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { branding } = useBranding();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Staff and customers sign in through the same /login page, so signed-in
  // staff get a link across to the admin console rather than having to type
  // the /admin URL. Any role other than Customer can reach /admin/dashboard
  // (its own sections stay permission-gated -- see each admin page.jsx).
  const isStaff = Boolean(user?.roles?.some((role) => role !== 'Customer'));

  // The access token is held in memory only, so on a fresh load the session is
  // unknown until bootstrapSession() has exchanged the refresh cookie. Until
  // then the header renders no auth-dependent chrome: showing "Sign In" to a
  // user who is in fact signed in, and then swapping it out, is worse than a
  // brief gap. The slot keeps its width so the header does not reflow.
  const sessionKnown = !isLoading;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.push('/');
    }
  }

  return (
    <div className="customer-layout">
      <header className="customer-header">
        <div className="customer-header__inner container">
          <Link href="/" className="customer-header__brand" onClick={() => setMenuOpen(false)}>
            <BrandMark />
          </Link>

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
              <Link key={link.to} href={link.to} className="customer-header__link" onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            {sessionKnown &&
              isAuthenticated &&
              AUTHED_LINKS.map((link) => (
                <Link key={link.to} href={link.to} className="customer-header__link" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}

            {sessionKnown && isStaff && (
              <Link href="/admin" className="customer-header__link" onClick={() => setMenuOpen(false)}>
                Admin
              </Link>
            )}

            <div className="customer-header__auth" aria-busy={!sessionKnown}>
              {!sessionKnown ? (
                <span className="customer-header__auth-placeholder" aria-hidden="true" />
              ) : isAuthenticated ? (
                <>
                  <span className="customer-header__user">{user?.firstName || user?.email}</span>
                  <Button variant="secondary" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button as={Link} variant="ghost" href="/login" onClick={() => setMenuOpen(false)}>
                    Sign In
                  </Button>
                  <Button as={Link} href="/register" onClick={() => setMenuOpen(false)}>
                    Register
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="customer-main">
        {children}
      </main>

      <footer className="customer-footer">
        <div className="container customer-footer__inner">
          {/* Genuinely time-dependent text on a prerendered page, so the year can
              lag the client's around New Year. No layout impact, so the documented
              React escape hatch fits better than deferring it to a second pass. */}
          <p suppressHydrationWarning>
            &copy; {new Date().getFullYear()} {branding.agency_name}. All rights reserved.
          </p>
          <p className="text-muted">Hotel booking and travel packages, all in one place.</p>
        </div>
      </footer>
    </div>
  );
}

export default CustomerLayout;
