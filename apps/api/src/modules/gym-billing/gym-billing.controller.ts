import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GymBillingService } from './gym-billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { EntitlementGuard } from '../subscription/guards/entitlement.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '@klyro/types';
import { PERMISSIONS } from '@klyro/config';
import { CreateInvoiceDto, RecordPaymentDto, RefundPaymentDto, FinancialSummaryQueryDto } from '@klyro/validation';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, EntitlementGuard)
export class GymBillingController {
  constructor(private readonly gymBillingService: GymBillingService) {}

  @Post('invoices')
  @RequirePermissions(PERMISSIONS.INVOICE_CREATE)
  async createInvoice(
    @GetTenantContext() tenantContext: TenantContext,
    @Body() dto: CreateInvoiceDto,
  ) {
    if (!dto.branchId && tenantContext.branchId) {
      dto.branchId = tenantContext.branchId;
    }
    return this.gymBillingService.createInvoice(tenantContext.organizationId, dto);
  }

  @Get('invoices')
  @RequirePermissions(PERMISSIONS.INVOICE_READ)
  async getInvoices(
    @GetTenantContext() tenantContext: TenantContext,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.gymBillingService.getInvoices(
      tenantContext.organizationId,
      customerId,
      status,
      branchId || tenantContext.branchId,
    );
  }

  @Get('invoices/:id')
  @RequirePermissions(PERMISSIONS.INVOICE_READ)
  async getInvoiceById(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
  ) {
    return this.gymBillingService.getInvoiceById(tenantContext.organizationId, id);
  }

  @Get('payments')
  @RequirePermissions(PERMISSIONS.PAYMENT_READ)
  async getPayments(
    @GetTenantContext() tenantContext: TenantContext,
    @Query('customerId') customerId?: string,
    @Query('invoiceId') invoiceId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.gymBillingService.getPayments(
      tenantContext.organizationId,
      customerId,
      invoiceId,
      branchId || tenantContext.branchId,
    );
  }

  @Post('payments')
  @RequirePermissions(PERMISSIONS.PAYMENT_CREATE)
  async recordPayment(
    @GetTenantContext() tenantContext: TenantContext,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.gymBillingService.recordPayment(
      tenantContext.organizationId,
      tenantContext.userId,
      dto,
    );
  }

  @Post('payments/:id/refund')
  @RequirePermissions(PERMISSIONS.PAYMENT_REFUND)
  async refundPayment(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.gymBillingService.refundPayment(
      tenantContext.organizationId,
      tenantContext.userId,
      id,
      dto.amount,
      dto.notes,
    );
  }

  @Get('customers/:id/invoices')
  @RequirePermissions(PERMISSIONS.INVOICE_READ)
  async getCustomerInvoices(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') customerId: string,
  ) {
    return this.gymBillingService.getInvoices(tenantContext.organizationId, customerId);
  }

  @Get('customers/:id/payments')
  @RequirePermissions(PERMISSIONS.PAYMENT_READ)
  async getCustomerPayments(
    @GetTenantContext() tenantContext: TenantContext,
    @Param('id') customerId: string,
  ) {
    return this.gymBillingService.getPayments(tenantContext.organizationId, customerId);
  }

  @Get('financial-summary')
  @RequirePermissions(PERMISSIONS.FINANCIAL_SUMMARY_READ)
  async getFinancialSummary(
    @GetTenantContext() tenantContext: TenantContext,
    @Query() queryDto: FinancialSummaryQueryDto,
  ) {
    const effectiveQuery = {
      ...queryDto,
      branchId: queryDto?.branchId || tenantContext.branchId,
    };
    return this.gymBillingService.getFinancialSummary(tenantContext.organizationId, effectiveQuery);
  }
}
