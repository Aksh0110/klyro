import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  CreateSubscriptionResult,
  CreatePaymentResult,
  CreateMandateResult,
} from './payment-provider.interface';

@Injectable()
export class DevPaymentProvider implements PaymentProvider {
  name = 'DEV_PROVIDER';
  private readonly logger = new Logger(DevPaymentProvider.name);

  async createSubscription(planCode: string, amount: number): Promise<CreateSubscriptionResult> {
    const providerSubscriptionId = `sub_dev_${Date.now()}`;
    this.logger.log(`[DEV MODE] Created subscription ${providerSubscriptionId} for plan ${planCode} (₹${amount})`);
    return {
      providerSubscriptionId,
      checkoutUrl: `/setup/subscription?dev_sub_id=${providerSubscriptionId}`,
    };
  }

  async createInitialPayment(subscriptionId: string, amount: number): Promise<CreatePaymentResult> {
    const providerPaymentId = `pay_dev_${Date.now()}`;
    const providerOrderId = `order_dev_${Date.now()}`;
    this.logger.log(`[DEV MODE] Simulated initial payment ${providerPaymentId} (₹${amount})`);
    return {
      providerPaymentId,
      providerOrderId,
      status: 'SUCCESS',
    };
  }

  async createMandate(subscriptionId: string, method: string): Promise<CreateMandateResult> {
    const providerMandateId = `man_dev_${Date.now()}`;
    this.logger.log(`[DEV MODE] Simulated AutoPay mandate ${providerMandateId} (${method})`);
    return {
      providerMandateId,
      status: 'ACTIVE',
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    this.logger.log(`[DEV MODE] Cancelled subscription ${providerSubscriptionId}`);
    return true;
  }

  verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    return true; // Always valid in dev simulation
  }
}
