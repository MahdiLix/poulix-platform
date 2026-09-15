import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { AccountTemporarilyLockedException } from '../rate-limit';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.headers['user-agent'], req.ip);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      return await this.authService.login(
        dto,
        req.headers['user-agent'],
        req.ip,
      );
    } catch (error) {
      if (error instanceof AccountTemporarilyLockedException) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
      }
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.id, user.sessionId);
  }
}
