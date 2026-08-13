import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CreateMembershipPlanDto, UpdateMembershipPlanDto } from '@klyro/validation';
import { PERMISSIONS } from '@klyro/config';
import { MembershipPlansService } from './membership-plans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '@klyro/types';

@Controller('membership-plans')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class MembershipPlansController {
  constructor(private readonly plansService: MembershipPlansService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_CREATE)
  async createPlan(
    @GetTenantContext() tenantContext: TenantContext,
    @Body() dto: CreateMembershipPlanDto,
  ) {
    return this.plansService.createPlan(tenantContext.organizationId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_READ)
  async getPlans(
    @GetTenantContext() tenantContext: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.plansService.findAllByOrganization(tenantContext.organizationId, pageNum, limitNum);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_READ)
  async getPlanById(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
  ) {
    return this.plansService.findOneByIdAndOrg(id, tenantContext.organizationId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_UPDATE)
  async updatePlan(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateMembershipPlanDto,
  ) {
    return this.plansService.updatePlan(id, tenantContext.organizationId, dto);
  }
}
