'use client';

import { useRouter } from 'next/navigation';
import { Button } from './Button.jsx';
import { ArrowLeftIcon } from './icons.jsx';

/**
 * Returns to the page the visitor came from. With no history to go back to
 * (the URL was opened directly in a fresh tab) it falls back to the home page
 * instead of doing nothing.
 */
export function BackButton({ fallback = '/', children = 'Back' }) {
  const router = useRouter();

  function goBack() {
    // The Navigation API only counts entries from THIS site, so a page opened
    // straight into a fresh tab (whose "previous" entry is about:blank or
    // another site) correctly falls back. history.length can't tell them apart.
    const canGoBack = window.navigation ? window.navigation.canGoBack : window.history.length > 1;
    if (canGoBack) router.back();
    else router.push(fallback);
  }

  return (
    <Button icon={<ArrowLeftIcon />} onClick={goBack}>
      {children}
    </Button>
  );
}

export default BackButton;
