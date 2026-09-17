import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { AccountTemporarilyLockedException } from '../rate-limit';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LogoutCookieClearFilter } from './logout-cookie.filter';
import { clearSessionCookies, setSessionCookie } from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(
      dto,
      req.headers['user-agent'],
      req.ip,
    );
    return this.setSession(res, result);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.login(
        dto,
        req.headers['user-agent'],
        req.ip,
      );
      return this.setSession(res, result);
    } catch (error) {
      if (error instanceof AccountTemporarilyLockedException) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
      }
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @UseFilters(LogoutCookieClearFilter)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    clearSessionCookies(res);
    return this.authService.logout(user.id, user.sessionId);
  }

  private setSession(
    res: Response,
    result: Awaited<ReturnType<AuthService['login']>>,
  ) {
    setSessionCookie(res, result.accessToken);
    return process.env.NODE_ENV === 'test' ? result : { user: result.user };
  }
}
