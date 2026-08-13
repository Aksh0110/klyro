import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { CreateOrganizationDto, UpdateOrganizationDto } from '@klyro/validation';
import { PERMISSIONS } from '@klyro/config';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUser, GetTenantContext } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '@klyro/types';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async createOrganization(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.createOrganization(userId, dto);
  }

  @Get('current')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ORGANIZATION_READ)
  async getCurrentOrganization(@GetTenantContext() tenantContext: TenantContext) {
    return this.organizationsService.getOrganizationById(tenantContext.organizationId);
  }

  @Patch('current')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.ORGANIZATION_UPDATE)
  async updateCurrentOrganization(
    @GetTenantContext() tenantContext: TenantContext,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateOrganization(tenantContext.organizationId, dto);
  }
}
