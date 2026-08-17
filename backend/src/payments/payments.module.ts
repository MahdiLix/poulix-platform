import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ZarinpalService } from './zarinpal.service';

@Module({
  providers: [ZarinpalService, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
