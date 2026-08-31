import { vi } from 'vitest';

/**
 * Stand-in for next/navigation in component tests.
 *
 * React Router could be driven in a test by rendering a <MemoryRouter> around
 * the tree, so assertions could check which route rendered. The App Router has
 * no in-memory equivalent -- navigation is a side effect of the framework -- so
 * tests instead set the current location up front and assert on the spy calls
 * the component makes. `redirect()` maps onto replace(), which is what it does.
 */
export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

export const navState = {
  pathname: '/',
  searchParams: new URLSearchParams(),
  params: {},
};

/** Sets the location a component sees: pathname, ?query and any [id] segments. */
export function setNavigation({ pathname = '/', search = '', params = {} } = {}) {
  navState.pathname = pathname;
  navState.searchParams = new URLSearchParams(search);
  navState.params = params;
}

export function resetNavigation() {
  Object.values(routerMock).forEach((fn) => fn.mockClear());
  setNavigation();
}
