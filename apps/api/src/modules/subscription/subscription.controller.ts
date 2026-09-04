import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Headers,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
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

  @Post('free-trial')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async startFreeTrial(
    @GetTenantContext() tenantContext: TenantContext,
    @Body('planCode') planCode?: string,
  ) {
    return this.subscriptionService.startFreeTrial(tenantContext.organizationId, planCode);
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
    const res = await this.subscriptionService.checkout(tenantContext.organizationId, dto);
    return {
      ...res,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TSlH8WnGPPBsO7',
    };
  }

  @Post('verify-payment')

  @UseGuards(JwtAuthGuard, TenantGuard)
  async verifyPayment(
    @GetTenantContext() tenantContext: TenantContext,
    @Body()
    dto: {
      razorpayPaymentId?: string;
      razorpayOrderId?: string;
      razorpaySignature?: string;
      subscriptionPlanId?: string;
    },
  ) {
    return this.subscriptionService.verifyPayment(tenantContext.organizationId, dto);
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
  async handleRazorpayWebhook(@Headers('x-razorpay-signature') signature: string, @Body() body: any) {
    if (!body) {
      throw new BadRequestException('Invalid Razorpay webhook body');
    }
    await this.subscriptionService.handleRazorpayWebhook(body);
    return { status: 'ok' };
  }

  @Get('webhooks/razorpay')
  async handleRazorpayGetCallback(
    @Query('subscriptionId') subscriptionId: string,
    @Res() res: Response,
  ) {
    if (subscriptionId) {
      await this.subscriptionService.handleRazorpayWebhook({
        event: 'subscription.charged',
        payload: { subscription: { id: subscriptionId } },
      });
    }
    const webUrl = process.env.WEB_URL || 'http://localhost:3000';
    return res.redirect(`${webUrl}/dashboard`);
  }
}
