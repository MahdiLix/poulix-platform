import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import crypto from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DatabaseService } from '../../src/database/database.service';

export type TestUser = {
  username: string;
  email: string;
  password: string;
};

export type AuthSession = TestUser & {
  userId: string;
  accessToken: string;
};

export function uniqueUser(): TestUser {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return {
    username: `u${suffix}`,
    email: `u${suffix}@example.com`,
    password: 'password123',
  };
}

export function balanceOf(value: { toString(): string } | string | number) {
  return Number(value.toString());
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

export function getDatabase(app: INestApplication) {
  return app.get(DatabaseService);
}

export async function registerUser(
  app: INestApplication,
  user: TestUser = uniqueUser(),
): Promise<AuthSession> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send(user)
    .expect(201);

  return {
    ...user,
    userId: response.body.user.id as string,
    accessToken: response.body.accessToken as string,
  };
}

export async function cleanupUser(db: DatabaseService, userId: string) {
  const wallet = await db.wallet.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (wallet) {
    await db.transaction.deleteMany({ where: { walletId: wallet.id } });
    await db.wallet.delete({ where: { id: wallet.id } });
  }

  await db.user.deleteMany({ where: { id: userId } });
}
