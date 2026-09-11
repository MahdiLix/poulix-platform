import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLoggingModule {}
