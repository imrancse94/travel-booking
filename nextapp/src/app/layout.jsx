import { Providers } from './providers.jsx';
import { getSession } from '../lib/session.js';
import { DEFAULT_LOGO_ICON } from '../lib/appConfig.js';
import { getBranding } from '../lib/branding.js';
import { Inter, Poppins } from 'next/font/google';
import localFont from 'next/font/local';
import '../styles/index.css';

const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700'], display: 'swap', variable: '--font-poppins' });
// Icon font (ligatures: <Icon name="home" />), committed under src/fonts as a
// ~5 KB subset of Material Symbols. To add an icon, see components/ui/Icon.jsx.
const icons = localFont({ src: '../fonts/material-symbols.woff2', display: 'block', variable: '--font-icons' });
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

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
    icons: { icon: branding.agency_favicon_url || DEFAULT_LOGO_ICON },
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
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${icons.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers session={session} branding={branding}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
