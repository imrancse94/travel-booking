'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Breadcrumbs } from '../components/ui/index.js';
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
  const { user, hasPermission, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const visibleNavItems = ADMIN_NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));
  const breadcrumbItems = getBreadcrumbTrail(pathname);
  const userLabel = user ? (user.firstName ? `${user.firstName} ${user.lastName}` : user.email) : '';

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.push('/login');
    }
  }

  return (
    <div className="admin-layout">
      <aside className={`admin-layout__sidebar ${sidebarOpen ? 'admin-layout__sidebar--open' : ''}`}>
        <div className="admin-layout__brand">
          <span className="admin-layout__brand-mark">TA</span>
          <span className="admin-layout__brand-name">Travel Admin</span>
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
                {item.icon}
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

          <div className="admin-layout__topbar-agency">Global Travel Agency</div>

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
      </div>
    </div>
  );
}

export default AdminLayout;
