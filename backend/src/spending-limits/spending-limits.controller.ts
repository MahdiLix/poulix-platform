import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { UpdateSpendingLimitDto } from './dto/update-spending-limit.dto';
import { SpendingLimitsService } from './spending-limits.service';

@Controller('spending-limits')
@UseGuards(JwtAuthGuard)
export class SpendingLimitsController {
  constructor(private readonly spendingLimitsService: SpendingLimitsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.spendingLimitsService.getLimitsWithUsage(user.id);
  }

  @Put()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSpendingLimitDto,
  ) {
    return this.spendingLimitsService.updateLimit(user.id, dto);
  }
}
