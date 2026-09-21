// In-memory access token store. The refresh token lives in an httpOnly
// cookie set by the backend, so the access token only ever needs to survive
// for the lifetime of the tab -- keeping it out of localStorage avoids
// exposing it to XSS-injected scripts.
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}
