import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SelfCheckInDto } from '@klyro/validation';
import { PERMISSIONS } from '@klyro/config';
import { TenantContext } from '@klyro/types';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { EntitlementGuard } from '../subscription/guards/entitlement.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext } from '../../common/decorators/tenant.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, EntitlementGuard)
export class AttendanceController {

  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('self-check-in')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SELF_CHECKIN)
  async selfCheckIn(
    @Request() req: any,
    @GetTenantContext() tenantContext: TenantContext,
    @Body() dto: SelfCheckInDto,
  ) {
    return this.attendanceService.selfCheckIn(
      req.user,
      tenantContext.organizationId,
      tenantContext.branchId,
      dto,
    );
  }

  @Get('my')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ_OWN)
  async getMyAttendance(
    @Request() req: any,
    @GetTenantContext() tenantContext: TenantContext,
  ) {
    return this.attendanceService.getMyAttendance(req.user, tenantContext.organizationId);
  }

  @Get('today')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async getTodayAttendanceList(@GetTenantContext() tenantContext: TenantContext) {
    return this.attendanceService.getTodayAttendanceList(
      tenantContext.organizationId,
      tenantContext.branchId,
    );
  }

  @Get('summary')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_SUMMARY)
  async getAttendanceSummary(@GetTenantContext() tenantContext: TenantContext) {
    return this.attendanceService.getAttendanceSummary(
      tenantContext.organizationId,
      tenantContext.branchId,
    );
  }

  @Get('customer/:customerId')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async getCustomerAttendance(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('customerId') customerId: string,
  ) {
    return this.attendanceService.getCustomerAttendance(customerId, tenantContext.organizationId);
  }
}
