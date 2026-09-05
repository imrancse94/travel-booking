import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { disconnectDb } from '../../src/db/index.js';
import { ensureRolesAndPermissions, createAdmin } from '../helpers/fixtures.js';

const app = createApp();

async function login(email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.data.accessToken;
}

describe('user management', () => {
  let admin;
  let adminToken;

  beforeAll(async () => {
    await ensureRolesAndPermissions();
    admin = await createAdmin();
    adminToken = await login(admin.email, admin.password);
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('refuses to delete the account making the request', async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${admin.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
    expect(res.body.message).toBe('You cannot delete your own account');

    // Still able to authenticate, i.e. the account really was left alone.
    const stillThere = await request(app)
      .get(`/api/v1/users/${admin.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.data.deletedAt).toBeNull();
  });

  it('leaves the caller\'s own account out of the list, but includes other users', async () => {
    const other = await createAdmin();

    const res = await request(app).get('/api/v1/users?limit=100').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((u) => u.id);
    expect(ids).not.toContain(admin.user.id);
    expect(ids).toContain(other.user.id);
  });

  it('deletes a different user', async () => {
    const other = await createAdmin();

    const res = await request(app)
      .delete(`/api/v1/users/${other.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const gone = await request(app)
      .get(`/api/v1/users/${other.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(gone.status).toBe(404);
  });
});
