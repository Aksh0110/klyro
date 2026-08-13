import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  CreateSubscriptionResult,
  CreatePaymentResult,
  CreateMandateResult,
} from './payment-provider.interface';

@Injectable()
export class RazorpayProvider implements PaymentProvider {
  name = 'RAZORPAY';
  private readonly logger = new Logger(RazorpayProvider.name);

  async createSubscription(planCode: string, amount: number): Promise<CreateSubscriptionResult> {
    const providerSubscriptionId = `sub_rzp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    this.logger.log(`Created Razorpay subscription reference: ${providerSubscriptionId}`);
    return {
      providerSubscriptionId,
      checkoutUrl: `https://checkout.razorpay.com/v1/checkout.html?subscription_id=${providerSubscriptionId}`,
    };
  }

  async createInitialPayment(subscriptionId: string, amount: number): Promise<CreatePaymentResult> {
    const providerPaymentId = `pay_rzp_${Date.now()}`;
    const providerOrderId = `order_rzp_${Date.now()}`;
    return {
      providerPaymentId,
      providerOrderId,
      status: 'SUCCESS',
    };
  }

  async createMandate(subscriptionId: string, method: string): Promise<CreateMandateResult> {
    const providerMandateId = `man_rzp_${Date.now()}`;
    return {
      providerMandateId,
      status: 'ACTIVE',
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    this.logger.log(`Cancelling Razorpay subscription: ${providerSubscriptionId}`);
    return true;
  }

  verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }
}
