/**
 * Turns a Server Action's `{ success, data, message, errors, statusCode }`
 * result (see server/actions/_actionResult.js) back into the throw/catch
 * shape every 'use client' call site already has from the ApiClient.js days
 * (`catch (err) { showToast(err.message) }`, some also read `err.errors`/
 * `err.statusCode`) -- so converting a call site to a Server Action is a
 * mechanical `someService.write(x)` -> `callAction(someWriteAction, x)` swap,
 * not a rewrite of the surrounding try/catch.
 */
export async function callAction(action, ...args) {
  const result = await action(...args);
  if (!result.success) {
    const err = new Error(result.message);
    err.errors = result.errors;
    err.statusCode = result.statusCode;
    err.isApiError = true;
    throw err;
  }
  return result.data;
}
