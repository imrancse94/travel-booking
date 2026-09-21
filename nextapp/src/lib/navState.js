'use client';

/**
 * React Router let a navigation carry arbitrary `state`
 * (`navigate('/checkout', { state })`). The App Router has no equivalent --
 * router.push() takes a URL and nothing else -- so the three things that
 * relied on it are handled explicitly here.
 *
 * Small, URL-safe values (where to return after signing in, which notice to
 * show) travel as query params. The checkout draft is a structured object far
 * too large for a URL, so it goes through sessionStorage: tab-scoped, dropped
 * when the tab closes, and readable after the navigation completes.
 */

const CHECKOUT_DRAFT_KEY = 'checkout:draft';

export function saveCheckoutDraft(draft) {
  try {
    window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private mode or storage disabled: checkout finds no draft and sends the
    // user back to the hotel page, which is the same path as an expired draft.
  }
}

export function readCheckoutDraft() {
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCheckoutDraft() {
  try {
    window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

/** Builds `/login?from=...` so signing in returns the user where they were. */
export function loginUrlFrom(pathWithSearch) {
  return `/login?from=${encodeURIComponent(pathWithSearch)}`;
}

/**
 * `from` used to be router state, which a user could not forge. As a query
 * param it is attacker-controllable, so only same-origin absolute paths are
 * honoured -- otherwise `?from=https://evil.example` would turn the login form
 * into an open redirect. `//host` is rejected too: the browser reads it as
 * protocol-relative and would leave the site.
 */
export function safeRedirectTarget(from, fallback = '/') {
  if (!from || typeof from !== 'string') return fallback;
  if (!from.startsWith('/') || from.startsWith('//')) return fallback;
  return from;
}

const FLASH_KEY = 'flash:notice';

/**
 * One-shot notice handed from the page that navigates to the page that lands
 * ("Account created.", "Password reset."). It goes through sessionStorage
 * rather than a query param for two reasons: the message can be server-supplied
 * text of any length, and a notice should not survive being bookmarked, shared
 * or reloaded.
 */
export function setFlash(message) {
  try {
    window.sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    // A missing confirmation banner is not worth failing the navigation over.
  }
}

/** Reads and clears in one go, so the notice shows exactly once. */
export function takeFlash() {
  try {
    const message = window.sessionStorage.getItem(FLASH_KEY);
    if (message) window.sessionStorage.removeItem(FLASH_KEY);
    return message;
  } catch {
    return null;
  }
}
