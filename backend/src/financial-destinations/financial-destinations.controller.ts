import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { CreateSavedDestinationDto } from './dto/create-saved-destination.dto';
import { UpdateSavedDestinationDto } from './dto/update-saved-destination.dto';
import { FinancialDestinationsService } from './financial-destinations.service';

@Controller('financial-destinations')
@UseGuards(JwtAuthGuard)
export class FinancialDestinationsController {
  constructor(
    private readonly financialDestinationsService: FinancialDestinationsService,
  ) {}

  @Get('recent')
  listRecent(@CurrentUser() user: AuthenticatedUser) {
    return this.financialDestinationsService.listRecent(user.id);
  }

  @Get('saved')
  listSaved(@CurrentUser() user: AuthenticatedUser) {
    return this.financialDestinationsService.listSaved(user.id);
  }

  @Post('saved')
  createSaved(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSavedDestinationDto,
  ) {
    return this.financialDestinationsService.createSaved(user.id, dto);
  }

  @Patch('saved/:id')
  updateSaved(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSavedDestinationDto,
  ) {
    return this.financialDestinationsService.updateSavedLabel(
      user.id,
      id,
      dto.label,
    );
  }

  @Delete('saved/:id')
  deleteSaved(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.financialDestinationsService.deleteSaved(user.id, id);
  }

  @Get(':id/value')
  getValue(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.financialDestinationsService.getValueForOwner(user.id, id);
  }
}
