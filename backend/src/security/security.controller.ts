import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { SecurityEventsQueryDto } from './dto/security-events-query.dto';
import { SecurityService } from './security.service';

@Controller('security')
@UseGuards(JwtAuthGuard)
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('sessions')
  listSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.securityService.listSessions(user.id, user.sessionId);
  }

  @Get('events')
  listEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SecurityEventsQueryDto,
  ) {
    return this.securityService.listEvents(user.id, query);
  }

  @Post('sessions/:id/revoke')
  revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.securityService.revokeSessionEnvironment(user.id, sessionId);
  }

  @Post('touch')
  touchSession(@CurrentUser() user: AuthenticatedUser) {
    return this.securityService.touchSession(user.id, user.sessionId);
  }
}
