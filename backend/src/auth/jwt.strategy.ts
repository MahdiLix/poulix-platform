import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../database/database.service';
import { getJwtSecret } from './jwt.config';
import type { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly db: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.db.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.status === 'DISABLED') {
      throw new UnauthorizedException('Account disabled');
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException('Account locked');
    }

    if (payload.sid) {
      const session = await this.db.userSession.findFirst({
        where: {
          id: payload.sid,
          userId: user.id,
          revokedAt: null,
        },
        select: { id: true },
      });

      if (!session) {
        throw new UnauthorizedException();
      }
    }

    return {
      ...user,
      sessionId: payload.sid,
    };
  }
}
