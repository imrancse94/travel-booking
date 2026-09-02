'use client';

import { SessionProvider } from '../contexts/AuthContext.jsx';
import { ToastProvider } from '../components/ui/index.js';

/**
 * The only client-side providers the app needs.
 *
 * The Redux store that used to sit here is gone: it held exactly
 * { user, isLoading }, which the server now resolves before rendering and
 * passes down as `session`. Toasts stay client-side because they are a
 * browser-only, ephemeral UI queue.
 */
export function Providers({ session, children }) {
  return (
    <SessionProvider session={session}>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}

export default Providers;
