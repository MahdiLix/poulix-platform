import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { EnvelopeAmountDto } from './dto/envelope-amount.dto';
import { EnvelopesService } from './envelopes.service';

@Controller('envelopes')
@UseGuards(JwtAuthGuard)
export class EnvelopesController {
  constructor(private readonly envelopesService: EnvelopesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEnvelopeDto,
  ) {
    return this.envelopesService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.envelopesService.listForUser(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.envelopesService.getByIdForUser(user.id, id);
  }

  @Post(':id/allocate')
  allocate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EnvelopeAmountDto,
  ) {
    return this.envelopesService.allocate(user.id, id, dto.amount);
  }

  @Post(':id/release')
  release(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EnvelopeAmountDto,
  ) {
    return this.envelopesService.release(user.id, id, dto.amount);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.envelopesService.cancel(user.id, id);
  }
}
