// The API's list validators cap `limit` at 100 (see backend/src/validators/*.js)
// and reject anything larger with a 422. Screens that load a whole collection
// into a dropdown ask for this much rather than an arbitrary large number.
export const MAX_PAGE_SIZE = 100;
