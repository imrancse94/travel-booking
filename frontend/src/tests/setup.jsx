import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { resetNavigation } from './navigationMock.js';

// The factories import lazily because vi.mock is hoisted above the imports.
vi.mock('next/navigation', async () => {
  const { routerMock, navState } = await import('./navigationMock.js');
  return {
    useRouter: () => routerMock,
    usePathname: () => navState.pathname,
    useSearchParams: () => navState.searchParams,
    useParams: () => navState.params,
    redirect: (url) => routerMock.replace(url),
    notFound: () => undefined,
  };
});

// next/link renders an anchor and prefetches; in jsdom the anchor is all that
// matters, and it keeps `getByRole('link')` queries working as before.
vi.mock('next/link', async () => {
  const { default: React } = await import('react');
  return {
    default: function Link({ href, children, ...rest }) {
      return React.createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children);
    },
  };
});

afterEach(() => {
  resetNavigation();
  window.sessionStorage.clear();
});
