import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { getDatabaseUrl } from '../config';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
