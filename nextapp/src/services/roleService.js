import { httpClient } from './httpClient.js';

// Matches backend/src/routes/roles.routes.js exactly.
const BASE = '/roles';

export function listRoles() {
  return httpClient.get(BASE);
}

export function listPermissions() {
  return httpClient.get(`${BASE}/permissions`);
}

export function createRole(payload) {
  // payload: { name, description, permissionIds }
  return httpClient.post(BASE, payload);
}

export function updateRolePermissions(id, permissionIds) {
  return httpClient.put(`${BASE}/${id}/permissions`, { permissionIds });
}
