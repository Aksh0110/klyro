import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AssignMembershipDto, UpdateMembershipStatusDto } from '@klyro/validation';
import { PERMISSIONS } from '@klyro/config';
import { MembershipsService } from './memberships.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '@klyro/types';

@Controller('memberships')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_CREATE)
  async assignMembership(
    @GetTenantContext() tenantContext: TenantContext,
    @Body() dto: AssignMembershipDto,
  ) {
    return this.membershipsService.assignMembership(tenantContext.organizationId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_READ)
  async getMemberships(
    @GetTenantContext() tenantContext: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.membershipsService.findAllByOrganization(tenantContext.organizationId, pageNum, limitNum, status);
  }

  @Get('customer/:customerId')
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_READ)
  async getMembershipsByCustomer(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('customerId') customerId: string,
  ) {
    return this.membershipsService.findAllByCustomer(customerId, tenantContext.organizationId);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_UPDATE)
  async updateStatus(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateMembershipStatusDto,
  ) {
    return this.membershipsService.updateMembershipStatus(id, tenantContext.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_UPDATE)
  async updateMembership(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.membershipsService.updateMembershipDetails(id, tenantContext.organizationId, dto);
  }
}
