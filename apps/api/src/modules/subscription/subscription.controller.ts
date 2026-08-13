import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '@klyro/types';
import { PERMISSIONS } from '@klyro/config';
import { CheckoutSubscriptionDto, SetupAutopayDto } from '@klyro/validation';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getSubscriptionPlans();
  }

  @Get('current')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SUBSCRIPTION_READ)
  async getCurrentSubscription(@GetTenantContext() tenantContext: TenantContext) {
    return this.subscriptionService.getCurrentSubscription(tenantContext.organizationId);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SUBSCRIPTION_MANAGE)
  async checkout(
    @GetTenantContext() tenantContext: TenantContext,
    @Body() dto: CheckoutSubscriptionDto,
  ) {
    return this.subscriptionService.checkout(tenantContext.organizationId, dto);
  }

  @Post('autopay/setup')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SUBSCRIPTION_MANAGE)
  async setupAutopay(
    @GetTenantContext() tenantContext: TenantContext,
    @Body() dto: SetupAutopayDto,
  ) {
    return this.subscriptionService.setupAutopay(tenantContext.organizationId, dto);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SUBSCRIPTION_MANAGE)
  async cancelSubscription(@GetTenantContext() tenantContext: TenantContext) {
    return this.subscriptionService.cancelSubscription(tenantContext.organizationId);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.SUBSCRIPTION_READ)
  async getPayments(@GetTenantContext() tenantContext: TenantContext) {
    return this.subscriptionService.getPayments(tenantContext.organizationId);
  }

  @Post('webhooks/razorpay')
  async handleWebhook(@Headers('x-razorpay-signature') signature: string, @Body() body: any) {
    if (!body || !body.event) {
      throw new BadRequestException('Invalid webhook body');
    }
    await this.subscriptionService.handleRazorpayWebhook(body.event, body.payload || {});
    return { received: true };
  }
}
