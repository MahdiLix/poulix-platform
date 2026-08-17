import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import crypto from 'node:crypto';
import type { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, passwordHash: string): boolean {
    const [salt, storedHash] = passwordHash.split(':');

    if (!salt || !storedHash) {
      return false;
    }

    const computedHash = crypto.scryptSync(password, salt, 64);
    const storedHashBuffer = Buffer.from(storedHash, 'hex');

    return (
      storedHashBuffer.length === computedHash.length &&
      crypto.timingSafeEqual(storedHashBuffer, computedHash)
    );
  }

  private async createAuthResponse(user: { id: string; email: string }) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      user,
      accessToken,
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.db.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const passwordHash = this.hashPassword(dto.password);

    // Using a transaction to create both User and Wallet simultaneously
    try {
      return await this.db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: dto.username,
            email: dto.email,
            passwordHash,
          },
        });

        await tx.wallet.create({
          data: {
            userId: user.id,
          },
        });

        return this.createAuthResponse({ id: user.id, email: user.email });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Username or email already exists');
      }

      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.db.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user || !this.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createAuthResponse({ id: user.id, email: user.email });
  }
}
