import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  AdminGuard,
  CurrentUser,
  JwtAuthGuard,
  type AuthenticatedUser,
} from '../common';
import { AdminService } from './admin.service';

import {
  AdminAccountActionDto,
  AdminListQueryDto,
  AdminPaymentsQueryDto,
  AdminTransactionsQueryDto,
  AdminUsersQueryDto,
} from './dto/admin-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  listUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  getUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
  ) {
    return this.adminService.getUser(admin.id, userId);
  }

  @Post('users/:id/disable')
  disableUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: AdminAccountActionDto,
  ) {
    return this.adminService.setAccountStatus(
      admin.id,
      userId,
      'DISABLED',
      dto.reason,
    );
  }

  @Post('users/:id/enable')
  enableUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: AdminAccountActionDto,
  ) {
    return this.adminService.setAccountStatus(
      admin.id,
      userId,
      'ACTIVE',
      dto.reason,
    );
  }

  @Post('users/:id/lock')
  lockUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: AdminAccountActionDto,
  ) {
    return this.adminService.setAccountStatus(
      admin.id,
      userId,
      'LOCKED',
      dto.reason,
    );
  }

  @Post('users/:id/unlock')
  unlockUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') userId: string,
    @Body() dto: AdminAccountActionDto,
  ) {
    return this.adminService.setAccountStatus(
      admin.id,
      userId,
      'ACTIVE',
      dto.reason,
    );
  }

  @Get('transactions')
  listTransactions(@Query() query: AdminTransactionsQueryDto) {
    return this.adminService.listTransactions(query);
  }

  @Get('transactions/:id')
  getTransaction(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') transactionId: string,
  ) {
    return this.adminService.getTransaction(admin.id, transactionId);
  }

  @Get('payments')
  listPayments(@Query() query: AdminPaymentsQueryDto) {
    return this.adminService.listPayments(query);
  }

  @Get('payments/:id')
  getPayment(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') paymentId: string,
  ) {
    return this.adminService.getPayment(admin.id, paymentId);
  }

  @Get('withdrawals')
  listWithdrawals(@Query() query: AdminListQueryDto) {
    return this.adminService.listWithdrawals(query);
  }

  @Get('security-events')
  listSecurityEvents(@Query() query: AdminListQueryDto) {
    return this.adminService.listSecurityEvents(query);
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: AdminListQueryDto) {
    return this.adminService.listAuditLogs(query);
  }
}
