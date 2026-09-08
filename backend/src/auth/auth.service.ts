import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import validator from 'validator';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { SecurityService } from '../security/security.service';
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
    private readonly securityService: SecurityService,
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

  private async createAuthResponse(user: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    sessionId?: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      ...(user.sessionId ? { sid: user.sessionId } : {}),
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken,
    };
  }

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
    if (!validator.isEmail(dto.email)) {
      throw new BadRequestException('Invalid email');
    }

    const existingUser = await this.db.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const passwordHash = this.hashPassword(dto.password);

    try {
      const user = await this.db.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            username: dto.username,
            email: dto.email,
            passwordHash,
          },
        });

        await tx.wallet.create({
          data: {
            userId: created.id,
          },
        });

        return created;
      });

      const sessionId = await this.securityService.recordSuccessfulLogin(
        user.id,
        userAgent,
        ipAddress,
        { emitNewDeviceEvent: false },
      );

      return this.createAuthResponse({
        id: user.id,
        email: user.email,
        role: user.role,
        sessionId,
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

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.db.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
      },
    });

    if (!user || !this.verifyPassword(dto.password, user.passwordHash)) {
      if (user) {
        await this.securityService.recordFailedLogin(user.id, ipAddress);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'DISABLED') {
      throw new UnauthorizedException('Account disabled');
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException('Account locked');
    }

    const sessionId = await this.securityService.recordSuccessfulLogin(
      user.id,
      userAgent,
      ipAddress,
    );

    if (user.role === 'ADMIN') {
      await this.db.adminAuditLog.create({
        data: {
          adminUserId: user.id,
          action: 'ADMIN_LOGIN',
          targetType: 'session',
          targetId: user.id,
          success: true,
          ipAddress: ipAddress?.slice(0, 45),
        },
      });
    }

    return this.createAuthResponse({
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    });
  }

  async logout(userId: string, sessionId?: string) {
    if (!sessionId) {
      throw new UnauthorizedException('Session is not revocable');
    }

    return this.securityService.revokeSession(userId, sessionId);
  }
}
