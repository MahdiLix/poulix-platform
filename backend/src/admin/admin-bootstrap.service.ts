import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import crypto from 'node:crypto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    await this.ensureAdminFromEnv();
  }

  async ensureAdminFromEnv() {
    const email = process.env.ADMIN_EMAIL?.trim();
    const username = process.env.ADMIN_USERNAME?.trim();
    const password = process.env.ADMIN_PASSWORD;
    const resetPassword =
      process.env.ADMIN_RESET_PASSWORD === 'true' ||
      process.env.ADMIN_RESET_PASSWORD === '1';

    if (!email || !username || !password) {
      return;
    }

    if (username.length < 3 || password.length < 8 || !email.includes('@')) {
      this.logger.error(
        'Admin bootstrap skipped: ADMIN_EMAIL, ADMIN_USERNAME (min 3), and ADMIN_PASSWORD (min 8) must be valid',
      );
      return;
    }

    const existingByEmail = await this.db.user.findUnique({
      where: { email },
      select: { id: true, username: true, role: true },
    });
    const existingByUsername = await this.db.user.findUnique({
      where: { username },
      select: { id: true, email: true },
    });

    if (
      existingByUsername &&
      existingByEmail &&
      existingByUsername.id !== existingByEmail.id
    ) {
      this.logger.error(
        `Admin bootstrap skipped: username "${username}" and email "${email}" belong to different users`,
      );
      return;
    }

    if (existingByUsername && !existingByEmail) {
      this.logger.error(
        `Admin bootstrap skipped: username "${username}" is already taken`,
      );
      return;
    }

    if (existingByEmail) {
      await this.db.user.update({
        where: { id: existingByEmail.id },
        data: {
          role: 'ADMIN',
          status: 'ACTIVE',
          ...(resetPassword
            ? { passwordHash: this.hashPassword(password) }
            : {}),
        },
      });
      this.logger.log(`Admin bootstrap promoted ${email} to ADMIN`);
      return;
    }

    await this.db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          username,
          passwordHash: this.hashPassword(password),
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      await tx.wallet.create({
        data: { userId: user.id },
      });
    });

    this.logger.log(`Admin bootstrap created ADMIN account ${email}`);
  }

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }
}
