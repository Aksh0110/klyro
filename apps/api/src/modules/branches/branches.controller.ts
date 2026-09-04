import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CreateBranchDto, UpdateBranchDto } from '@klyro/validation';
import { PERMISSIONS } from '@klyro/config';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { EntitlementGuard } from '../subscription/guards/entitlement.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '@klyro/types';

@Controller('branches')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, EntitlementGuard)
export class BranchesController {

  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BRANCH_READ)
  async getBranches(
    @GetTenantContext() tenantContext: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.branchesService.findAllByOrganization(
      tenantContext.organizationId,
      pageNum,
      limitNum,
    );
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BRANCH_CREATE)
  async createBranch(
    @GetTenantContext() tenantContext: TenantContext,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchesService.createBranch(tenantContext.organizationId, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.BRANCH_READ)
  async getBranchById(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
  ) {
    return this.branchesService.findOneByIdAndOrg(id, tenantContext.organizationId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.BRANCH_UPDATE)
  async updateBranch(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.updateBranch(id, tenantContext.organizationId, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.BRANCH_UPDATE)
  async deleteBranch(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
  ) {
    return this.branchesService.deleteBranch(id, tenantContext.organizationId);
  }
}
