/**
 * Single source of truth for the app's identity. Safe to import from both
 * server and client code (no server-only imports). These are the defaults
 * everywhere; a name saved in Settings (agency_name) still overrides APP_NAME
 * at runtime.
 */

// The wordmark is drawn in two parts ("Stay" + gradient "vixo"), so the name is
// derived from them and cannot drift out of sync with the logo.
export const APP_NAME_PARTS = ['Stay', 'vixo'];
export const APP_NAME = APP_NAME_PARTS.join('');
export const APP_TAGLINE = 'Hotel Reservation';

// App icon (public/logo-icon.png): shown beside the wordmark and used as the
// browser-tab favicon until Settings supplies its own.
export const DEFAULT_LOGO_ICON = '/logo-icon.png';
