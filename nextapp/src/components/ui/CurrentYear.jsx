'use client';

import { useEffect, useRef } from 'react';

/**
 * The current year, for copyright lines. The server's year is rendered first so
 * the HTML is complete, then corrected to the visitor's own clock once mounted,
 * so a page rendered or cached before midnight on 31 Dec shows the right year
 * without a reload or a redeploy.
 *
 * The year is written to the DOM node directly: when the client's year differs
 * from the server's, React keeps the server's text on hydration (that is what
 * suppressHydrationWarning does), and setting state to the client's year would
 * be a no-op because it already equals the state React rendered with.
 */
export function CurrentYear() {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.textContent = String(new Date().getFullYear());
  }, []);

  return (
    <span ref={ref} suppressHydrationWarning>
      {new Date().getFullYear()}
    </span>
  );
}

export default CurrentYear;
