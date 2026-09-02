import { Module } from '@nestjs/common';
import { FinancialDestinationsController } from './financial-destinations.controller';
import { FinancialDestinationsService } from './financial-destinations.service';

@Module({
  controllers: [FinancialDestinationsController],
  providers: [FinancialDestinationsService],
  exports: [FinancialDestinationsService],
})
export class FinancialDestinationsModule {}
