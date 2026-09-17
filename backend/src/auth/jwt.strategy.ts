import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { DatabaseService } from '../database/database.service';
import { getJwtSecret } from './jwt.config';
import type { JwtPayload } from './jwt-payload.interface';

const SESSION_COOKIE = 'poulix_session';

function tokenFromRequest(request: {
  headers?: { authorization?: string; cookie?: string };
}): string | null {
  const authorization = request.headers?.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length);
  }

  const cookie = request.headers?.cookie ?? '';
  const entry = cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  if (!entry) {
    return null;
  }
  try {
    return decodeURIComponent(entry.slice(SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly db: DatabaseService) {
    super({
      jwtFromRequest: tokenFromRequest,
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
      tokenExp: payload.exp,
    };
  }
}
