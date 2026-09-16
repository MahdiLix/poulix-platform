import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ScheduledPaymentsService } from './scheduled-payments.service';

const SCHEDULER_INTERVAL_MS = 60_000;

@Injectable()
export class ScheduledPaymentsScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly scheduledPaymentsService: ScheduledPaymentsService,
  ) {}

  onModuleInit() {
    void this.scheduledPaymentsService.processDuePayments();
    this.intervalId = setInterval(() => {
      void this.scheduledPaymentsService.processDuePayments();
    }, SCHEDULER_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
