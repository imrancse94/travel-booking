import { Providers } from './providers.jsx';
import { getSession } from '../lib/session.js';
import '../styles/index.css';

export const metadata = {
  title: 'Global Travel Agency',
  description: 'Hotel booking and travel packages, all in one place.',
  icons: { icon: '/favicon.svg' },
};

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
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
