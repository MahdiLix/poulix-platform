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
});
