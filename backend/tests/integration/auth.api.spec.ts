import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  cleanupUser,
  createTestApp,
  getDatabase,
  uniqueUser,
} from '../helpers/app';
import type { DatabaseService } from '../../src/database/database.service';

describe('Auth API', () => {
  let app: INestApplication;
  let db: DatabaseService;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    db = getDatabase(app);
  });

  afterEach(async () => {
    await Promise.all(
      createdUserIds.splice(0).map((userId) => cleanupUser(db, userId)),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user and returns a JWT', async () => {
    const user = uniqueUser();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);

    createdUserIds.push(response.body.user.id);
    expect(response.body.user.email).toBe(user.email);
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(typeof response.body.user.expiresAt).toBe('string');
    expect(Date.parse(response.body.user.expiresAt)).toBeGreaterThan(Date.now());
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.accessToken.length).toBeGreaterThan(20);
  });

  it('rejects registration with an invalid email address', async () => {
    const user = uniqueUser();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...user, email: 'not-an-email' })
      .expect(400);
  });

  it('logs in with valid credentials and returns a JWT', async () => {
    const user = uniqueUser();
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);
    createdUserIds.push(registered.body.user.id);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: user.email, password: user.password })
      .expect(201);

    expect(response.body.user.id).toBe(registered.body.user.id);
    expect(typeof response.body.user.expiresAt).toBe('string');
    expect(Date.parse(response.body.user.expiresAt)).toBeGreaterThan(Date.now());
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.accessToken.length).toBeGreaterThan(20);
  });

  it('rejects login with invalid credentials', async () => {
    const user = uniqueUser();
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);
    createdUserIds.push(registered.body.user.id);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: user.email, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects protected routes without a JWT', async () => {
    await request(app.getHttpServer()).get('/wallets/balance').expect(401);
  });

  it('rejects protected routes with an invalid JWT', async () => {
    await request(app.getHttpServer())
      .get('/wallets/balance')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);
  });

  it('rejects a JWT after its session is revoked', async () => {
    const user = uniqueUser();
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);
    createdUserIds.push(registered.body.user.id);

    const sessions = await request(app.getHttpServer())
      .get('/security/sessions')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(200);

    expect(sessions.body).toHaveLength(1);

    await request(app.getHttpServer())
      .post(`/security/sessions/${sessions.body[0].id}/revoke`)
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .get('/wallets/balance')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(401);
  });

  it('logs out by revoking only the current JWT session', async () => {
    const user = uniqueUser();
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .set('User-Agent', 'TestBrowser/1.0 (Linux)')
      .send(user)
      .expect(201);
    createdUserIds.push(registered.body.user.id);

    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', 'TestBrowser/1.0 (Linux)')
      .send({ identifier: user.email, password: user.password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${loggedIn.body.accessToken}`)
      .expect(201)
      .expect({ success: true });

    await request(app.getHttpServer())
      .get('/wallets/balance')
      .set('Authorization', `Bearer ${loggedIn.body.accessToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/wallets/balance')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(200);
  });

  it('clears the session cookie with attributes matching the one set on login', async () => {
    const user = uniqueUser();
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);
    createdUserIds.push(registered.body.user.id);

    const loginSetCookie = registered.get('Set-Cookie') ?? [];
    const loginCookie = loginSetCookie.find((cookie: string) =>
      cookie.startsWith('poulix_session='),
    );
    expect(loginCookie).toBeDefined();

    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(201);

    const logoutSetCookie = logout.get('Set-Cookie') ?? [];
    const clearCookies = logoutSetCookie.filter((cookie: string) =>
      cookie.startsWith('poulix_session='),
    );
    expect(clearCookies.length).toBeGreaterThan(0);
    for (const cookie of clearCookies) {
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toContain('SameSite=Lax');
      // Local/test envs run over HTTP, so Secure should be absent here just
      // like the login cookie; both must agree either way.
      const loginHasSecure = /secure/i.test(loginCookie ?? '');
      const clearHasSecure = /secure/i.test(cookie);
      expect(clearHasSecure).toBe(loginHasSecure);
    }
  });

  it('clears the session cookie when logout is unauthorized', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(401);

    const clearCookies = (response.get('Set-Cookie') ?? []).filter(
      (cookie: string) => cookie.startsWith('poulix_session='),
    );
    expect(clearCookies.length).toBeGreaterThan(0);
    for (const cookie of clearCookies) {
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toContain('SameSite=Lax');
    }
  });

  it('returns a non-secret expiresAt on the current user profile', async () => {
    const user = uniqueUser();
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);
    createdUserIds.push(registered.body.user.id);

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(200);

    expect(me.body.id).toBe(registered.body.user.id);
    expect(typeof me.body.expiresAt).toBe('string');
    expect(Date.parse(me.body.expiresAt)).toBeGreaterThan(Date.now());
    expect(me.body).not.toHaveProperty('accessToken');
  });

  it('groups duplicate environments and identifies the current session', async () => {
    const user = uniqueUser();
    const userAgent =
      'Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0.0.0 Safari/537.36';
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .set('User-Agent', userAgent)
      .send(user)
      .expect(201);
    createdUserIds.push(registered.body.user.id);

    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', userAgent)
      .send({ identifier: user.username, password: user.password })
      .expect(201);

    const sessions = await request(app.getHttpServer())
      .get('/security/sessions')
      .set('Authorization', `Bearer ${loggedIn.body.accessToken}`)
      .expect(200);

    expect(sessions.body).toHaveLength(1);
    expect(sessions.body[0].sessionCount).toBe(2);
    expect(sessions.body[0].sessionIds).toHaveLength(2);
    expect(sessions.body[0].isCurrent).toBe(true);
    expect(sessions.body[0].environment).toEqual({
      browser: 'Chrome',
      os: 'Linux',
      device: 'desktop',
    });
  });

  it('paginates security events', async () => {
    const user = uniqueUser();
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);
    createdUserIds.push(registered.body.user.id);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: user.email, password: 'wrong-password' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: user.email, password: 'wrong-password' })
      .expect(401);

    const events = await request(app.getHttpServer())
      .get('/security/events?page=1&pageSize=1&type=FAILED_LOGIN')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(200);

    expect(events.body).toMatchObject({ page: 1, pageSize: 1, total: 2 });
    expect(events.body.items).toHaveLength(1);
    expect(events.body.items[0].type).toBe('FAILED_LOGIN');
  });
});
