import Link from 'next/link';

export const metadata = { title: 'Page not found · Global Travel Agency' };

/**
 * Renders the 404. It must RENDER, not redirect.
 *
 * This previously called redirect('/') to mirror the old React Router
 * catch-all. Two things were wrong with that. The redirect never actually
 * happened -- an unknown path still answered 404 -- and redirect() unwinds the
 * render by throwing, which aborted the performance.measure() React 19 opens
 * around every component and surfaced in the browser console as
 * "Failed to execute 'measure' on 'Performance': 'NotFound' cannot have a
 * negative time stamp" on ordinary page loads, because Next instantiates this
 * boundary as part of the route tree.
 *
 * A real 404 is also the better answer: it tells the visitor (and a crawler)
 * that the URL is wrong, instead of silently landing them on the home page.
 */
export default function NotFound() {
  return (
    <div className="container page-section">
      <div className="empty-state">
        <span className="empty-state__icon" aria-hidden="true">
          🧭
        </span>
        <h1 className="page-title">Page not found</h1>
        <p className="page-subtitle">
          The page you were looking for does not exist, or it may have moved.
        </p>
        <div className="not-found__actions">
          <Link className="btn btn--primary" href="/">
            <span className="btn__label">Back to home</span>
          </Link>
          <Link className="btn btn--secondary" href="/hotels">
            <span className="btn__label">Browse hotels</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
