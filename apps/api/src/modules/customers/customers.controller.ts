import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CreateCustomerDto, UpdateCustomerDto } from '@klyro/validation';
import { PERMISSIONS } from '@klyro/config';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { EntitlementGuard } from '../subscription/guards/entitlement.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '@klyro/types';

@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, EntitlementGuard)
export class CustomersController {

  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.CUSTOMER_CREATE)
  async createCustomer(
    @GetTenantContext() tenantContext: TenantContext,
    @Body() dto: CreateCustomerDto,
  ) {
    if (!dto.branchId && tenantContext.branchId) {
      dto.branchId = tenantContext.branchId;
    }
    return this.customersService.createCustomer(tenantContext.organizationId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CUSTOMER_READ)
  async getCustomers(
    @GetTenantContext() tenantContext: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return this.customersService.findAllByOrganization(tenantContext.organizationId, {
      page: pageNum,
      limit: limitNum,
      search,
      branchId: branchId || tenantContext.branchId,
      status,
    });
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CUSTOMER_READ)
  async getCustomerById(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
  ) {
    return this.customersService.findOneByIdAndOrg(id, tenantContext.organizationId);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CUSTOMER_UPDATE)
  async updateCustomer(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateCustomer(id, tenantContext.organizationId, dto);
  }
}
