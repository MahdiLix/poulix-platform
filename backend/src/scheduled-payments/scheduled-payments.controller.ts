import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { CreateScheduledPaymentDto } from './dto/create-scheduled-payment.dto';
import { ScheduledPaymentsService } from './scheduled-payments.service';

@Controller('scheduled-payments')
@UseGuards(JwtAuthGuard)
export class ScheduledPaymentsController {
  constructor(
    private readonly scheduledPaymentsService: ScheduledPaymentsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScheduledPaymentDto,
  ) {
    return this.scheduledPaymentsService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.scheduledPaymentsService.listForUser(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.scheduledPaymentsService.getByIdForUser(user.id, id);
  }

  @Post(':id/pause')
  pause(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.scheduledPaymentsService.pause(user.id, id);
  }

  @Post(':id/resume')
  resume(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.scheduledPaymentsService.resume(user.id, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.scheduledPaymentsService.cancel(user.id, id);
  }
}
