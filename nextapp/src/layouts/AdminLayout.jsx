'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext.jsx';
import { BrandMark, Breadcrumbs, CurrentYear, Icon } from '../components/ui/index.js';
import { useBranding } from '../contexts/BrandingContext.jsx';
import { ADMIN_NAV_ITEMS, getBreadcrumbTrail } from '../constants/navigation.js';
import '../styles/admin-pages.css';
import './AdminLayout.css';

/**
 * Shell for every /admin/* page: responsive sidebar (collapses to a
 * hamburger-triggered drawer below ~900px), top bar (agency name, current
 * user, logout) and a breadcrumb slot derived from the current route.
 * Nested pages render as {children}.
 */
export function AdminLayout({ children }) {
  const { user, hasPermission, hasRole, logout } = useAuth();
  const { branding } = useBranding();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const visibleNavItems = ADMIN_NAV_ITEMS.filter(
    (item) => (!item.permission || hasPermission(item.permission)) && (!item.role || hasRole(item.role))
  );
  const breadcrumbItems = getBreadcrumbTrail(pathname);
  const userLabel = user ? (user.firstName ? `${user.firstName} ${user.lastName}` : user.email) : '';

  function handleLogout() {
    return logout('/login');
  }

  return (
    <div className="admin-layout">
      <aside className={`admin-layout__sidebar ${sidebarOpen ? 'admin-layout__sidebar--open' : ''}`}>
        <div className="admin-layout__brand">
          <BrandMark tone="light" />
        </div>
        <nav className="admin-layout__nav">
          {visibleNavItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={`admin-layout__nav-link ${
                pathname === item.to || pathname.startsWith(`${item.to}/`) ? 'admin-layout__nav-link--active' : ''
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-layout__nav-icon" aria-hidden="true">
                <Icon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <div className="admin-layout__scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <div className="admin-layout__main">
        <header className="admin-layout__topbar">
          <button
            type="button"
            className="admin-layout__hamburger"
            aria-label="Toggle navigation"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="admin-layout__topbar-agency">{branding.agency_name}</div>

          <div className="admin-layout__topbar-user">
            <span className="admin-layout__user-name">{userLabel}</span>
            <button type="button" className="admin-layout__logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="admin-layout__breadcrumb-bar">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <main className="admin-layout__content">
          {children}
        </main>

        <footer className="admin-layout__footer">
          <span>
            &copy; <CurrentYear /> {branding.agency_name}. All rights reserved.
          </span>
        </footer>
      </div>
    </div>
  );
}

export default AdminLayout;
