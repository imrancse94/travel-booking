import { Suspense } from 'react';
import { Providers } from './providers.jsx';
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
 * Replaces index.html plus main.jsx's provider stack.
 *
 * The Suspense boundary is required, not cosmetic: AuthGate and several pages
 * call useSearchParams(), and Next refuses to prerender a route that reads
 * search params without a boundary above it.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Suspense>{children}</Suspense>
        </Providers>
      </body>
    </html>
  );
}
