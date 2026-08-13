export interface CreateSubscriptionResult {
  providerSubscriptionId: string;
  checkoutUrl?: string;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  providerOrderId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
}

export interface CreateMandateResult {
  providerMandateId: string;
  status: 'ACTIVE' | 'PENDING' | 'FAILED';
}

export interface PaymentProvider {
  name: string;
  createSubscription(planCode: string, amount: number): Promise<CreateSubscriptionResult>;
  createInitialPayment(subscriptionId: string, amount: number): Promise<CreatePaymentResult>;
  createMandate(subscriptionId: string, method: string): Promise<CreateMandateResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<boolean>;
  verifyWebhookSignature(body: string, signature: string, secret: string): boolean;
}
