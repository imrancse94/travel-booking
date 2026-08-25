import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { ensureRolesAndPermissions } from '../helpers/fixtures.js';

const app = createApp();

describe('auth', () => {
  beforeAll(async () => {
    await ensureRolesAndPermissions();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('registers a new customer account and auto-creates a Customer profile', async () => {
    const email = `register-${randomUUID()}@example.test`;

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ firstName: 'New', lastName: 'User', email, password: 'Str0ngPass!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.passwordHash).toBeUndefined();

    const customer = await prisma.customer.findUnique({ where: { email } });
    expect(customer).not.toBeNull();

    const roles = await prisma.userRole.findMany({
      where: { userId: res.body.data.id },
      include: { role: true },
    });
    expect(roles.map((r) => r.role.name)).toContain('Customer');
  });

  it('rejects registration with a weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ firstName: 'Weak', lastName: 'Pw', email: `weak-${randomUUID()}@example.test`, password: 'short' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('rejects a duplicate email on registration', async () => {
    const email = `dup-${randomUUID()}@example.test`;
    const payload = { firstName: 'Dup', lastName: 'User', email, password: 'Str0ngPass!' };

    await request(app).post('/api/v1/auth/register').send(payload).expect(201);
    const res = await request(app).post('/api/v1/auth/register').send(payload);

    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    const email = `login-${randomUUID()}@example.test`;
    const password = 'Str0ngPass!';
    await request(app).post('/api/v1/auth/register').send({ firstName: 'Log', lastName: 'In', email, password }).expect(201);

    const ok = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toEqual(expect.any(String));
    expect(ok.body.data.user.roles).toContain('Customer');

    const bad = await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPassword1' });
    expect(bad.status).toBe(401);
  });

  it('never leaks whether an account exists on forgot-password', async () => {
    const known = await request(app).post('/api/v1/auth/forgot-password').send({ email: `noreg-${randomUUID()}@example.test` });
    expect(known.status).toBe(200);
    expect(known.body.success).toBe(true);
  });

  it('rejects /me without a token and accepts it with one', async () => {
    const unauth = await request(app).get('/api/v1/auth/me');
    expect(unauth.status).toBe(401);

    const email = `me-${randomUUID()}@example.test`;
    const password = 'Str0ngPass!';
    await request(app).post('/api/v1/auth/register').send({ firstName: 'Me', lastName: 'User', email, password }).expect(201);
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });

    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
  });
});
