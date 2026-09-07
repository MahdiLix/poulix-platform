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
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.accessToken.length).toBeGreaterThan(20);
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
