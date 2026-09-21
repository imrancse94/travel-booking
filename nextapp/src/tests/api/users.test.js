// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { ensureRolesAndPermissions, createAdmin } from '../helpers/fixtures.js';
import { callRoute, bearer } from '../helpers/callRoute.js';

import { POST as login } from '../../app/api/v1/auth/login/route.js';
import { GET as listUsers } from '../../app/api/v1/users/route.js';
import { GET as getUser, DELETE as deleteUser } from '../../app/api/v1/users/[id]/route.js';

async function loginAs(email, password) {
  const res = await callRoute(login, { method: 'POST', path: '/api/v1/auth/login', body: { email, password } });
  return res.body.data.accessToken;
}

describe('user management', () => {
  let admin;
  let adminToken;

  beforeAll(async () => {
    await ensureRolesAndPermissions();
    admin = await createAdmin();
    adminToken = await loginAs(admin.email, admin.password);
  });

  it('refuses to delete the account making the request', async () => {
    const res = await callRoute(deleteUser, {
      method: 'DELETE',
      path: `/api/v1/users/${admin.user.id}`,
      headers: bearer(adminToken),
      routeParams: { id: admin.user.id },
    });

    expect(res.status).toBe(422);
    expect(res.body.message).toBe('You cannot delete your own account');

    // Still able to authenticate, i.e. the account really was left alone.
    const stillThere = await callRoute(getUser, {
      method: 'GET',
      path: `/api/v1/users/${admin.user.id}`,
      headers: bearer(adminToken),
      routeParams: { id: admin.user.id },
    });
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.data.deletedAt).toBeNull();
  });

  it("leaves the caller's own account out of the list, but includes other users", async () => {
    const other = await createAdmin();

    const res = await callRoute(listUsers, {
      method: 'GET',
      path: '/api/v1/users',
      query: { limit: 100 },
      headers: bearer(adminToken),
    });
    expect(res.status).toBe(200);
    const ids = res.body.data.map((u) => u.id);
    expect(ids).not.toContain(admin.user.id);
    expect(ids).toContain(other.user.id);
  });

  it('deletes a different user', async () => {
    const other = await createAdmin();

    const res = await callRoute(deleteUser, {
      method: 'DELETE',
      path: `/api/v1/users/${other.user.id}`,
      headers: bearer(adminToken),
      routeParams: { id: other.user.id },
    });
    expect(res.status).toBe(200);

    const gone = await callRoute(getUser, {
      method: 'GET',
      path: `/api/v1/users/${other.user.id}`,
      headers: bearer(adminToken),
      routeParams: { id: other.user.id },
    });
    expect(gone.status).toBe(404);
  });
});
