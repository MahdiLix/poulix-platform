import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    return user;
  }

  async findByIdentifier(identifier: string) {
    const trimmed = identifier.trim();
    if (!trimmed) {
      return null;
    }

    return this.db.user.findFirst({
      where: {
        OR: [{ email: trimmed }, { username: trimmed }],
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  }
}
