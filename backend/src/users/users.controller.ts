import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { LookupUserDto } from './dto/lookup-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async findMe(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.usersService.findById(user.id);
    if (!profile) {
      return profile;
    }
    return {
      ...profile,
      expiresAt:
        typeof user.tokenExp === 'number'
          ? new Date(user.tokenExp * 1000).toISOString()
          : undefined,
    };
  }

  @Get('lookup')
  async lookup(
    @Query() query: LookupUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const recipient = await this.usersService.findByIdentifier(
      query.identifier,
    );

    if (!recipient) {
      return { found: false as const };
    }

    if (recipient.id === user.id) {
      return { found: false as const, self: true as const };
    }

    return { found: true as const, user: recipient };
  }
}
