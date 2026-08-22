import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  constructor(private readonly configService: ConfigService) {}

  private get keyId(): string {
    return this.configService.get<string>('RAZORPAY_KEY_ID') || process.env.RAZORPAY_KEY_ID || 'rzp_test_TSlH8WnGPPBsO7';
  }

  private get keySecret(): string {
    return this.configService.get<string>('RAZORPAY_KEY_SECRET') || process.env.RAZORPAY_KEY_SECRET || 'G9m0zRq5kO6aCd30x1jcpfeY';
  }


  async createSubscription(planCode: string, amount: number): Promise<CreateSubscriptionResult> {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    let providerSubscriptionId = `order_rzp_${Date.now()}`;

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
          notes: {
            planCode,
          },
        }),
      });

      const orderData = await response.json();
      if (orderData?.id) {
        providerSubscriptionId = orderData.id;
        this.logger.log(`Created real Razorpay Order successfully: ${providerSubscriptionId}`);
      } else {
        this.logger.warn(`Razorpay Order API returned: ${JSON.stringify(orderData)}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to call Razorpay API: ${err.message}`);
    }

    return {
      providerSubscriptionId,
      checkoutUrl: '',
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

  verifyWebhookSignature(body: string, signature: string, secret?: string): boolean {
    if (!signature) return false;
    const webhookSecret = secret || this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || 'rzp_webhook_secret_key';
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }
}
