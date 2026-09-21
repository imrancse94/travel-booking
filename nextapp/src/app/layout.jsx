import { Providers } from './providers.jsx';
import { getSession } from '../lib/session.js';
import { getBranding } from '../lib/branding.js';
import '../styles/index.css';

/**
 * The browser tab follows the agency name configured in Settings.
 *
 * `title` is a template: a page with its own `metadata.title` (e.g.
 * not-found.jsx's "Page not found") gets it composed as "Page not found ·
 * <agency name>"; a page with none falls back to the agency name alone. That
 * keeps every page's tab title current without each one re-fetching branding.
 */
export async function generateMetadata() {
  const branding = await getBranding();
  return {
    title: { default: branding.agency_name, template: `%s · ${branding.agency_name}` },
    description: 'Hotel booking and travel packages, all in one place.',
    icons: { icon: branding.agency_favicon_url || '/favicon.svg' },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Server component. It resolves the session from the request's cookies and
 * hands it to the client providers, so the first paint already knows who is
 * signed in -- no bootstrap request, no signed-out flash.
 *
 * Reading cookies opts the whole tree into dynamic rendering. That is the
 * deliberate trade for server-side auth: a page whose content depends on who is
 * asking cannot also be a build-time static file.
 *
 * There is deliberately NO Suspense boundary here. One used to be required
 * because useSearchParams() cannot be statically prerendered -- but reading
 * cookies above already makes every route dynamic, so that constraint is gone.
 * Worse, a boundary at the root CATCHES the NEXT_REDIRECT that redirect()
 * throws: `/admin` degraded from a clean 307 into a rendered 404 plus a
 * one-second meta-refresh ("switched to client rendering because the server
 * rendering errored: NEXT_REDIRECT").
 */
export default async function RootLayout({ children }) {
  const [session, branding] = await Promise.all([getSession(), getBranding()]);

  return (
    <html lang="en">
      <body>
        <Providers session={session} branding={branding}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
