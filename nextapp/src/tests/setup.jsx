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

// The destination typeahead loads its catalogue on mount. Without this every test
// that renders it made a real HTTP request from jsdom, which fails (no server)
// and printed an AggregateError to stderr. An empty catalogue keeps the field
// inert; a test that cares about suggestions can mock the service itself.
vi.mock('../services/destinationService.js', () => ({
  list: vi.fn().mockResolvedValue({ data: [] }),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

afterEach(() => {
  resetNavigation();
  // API/integration tests run in the Node environment (no `window`), so this
  // cleanup -- meant for jsdom component tests -- is skipped there.
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear();
  }
});
