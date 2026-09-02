import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { SecurityService } from './security.service';

@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('sessions')
  listSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.securityService.listSessions(user.id);
  }

  @Get('events')
  listEvents(@CurrentUser() user: AuthenticatedUser) {
    return this.securityService.listEvents(user.id);
  }

  @Post('sessions/:id/revoke')
  revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.securityService.revokeSession(user.id, sessionId);
  }

  @Post('touch')
  touchSession(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.securityService.recordSuccessfulLogin(
      user.id,
      req.headers['user-agent'],
      req.ip,
    );
  }
}
