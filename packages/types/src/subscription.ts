import {
  SubscriptionStatusType,
  SubscriptionPaymentStatusType,
  MandateMethodType,
  MandateStatusType,
  PlanStatusType,
} from '@klyro/config';

export interface PlanFeatures {
  attendance?: boolean;
  reports?: boolean;
  staff?: boolean;
  renewalReminders?: boolean;
}

export interface ISubscriptionPlan {
  _id: string;
  name: string;
  code: string;
  description?: string;
  monthlyPrice: number;
  currency: string;
  memberLimit: number;
  features: PlanFeatures;
  status: PlanStatusType;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ISubscription {
  _id: string;
  organizationId: string;
  subscriptionPlanId: string | ISubscriptionPlan;
  status: SubscriptionStatusType;
  startedAt: Date | string;
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  cancelAtPeriodEnd: boolean;
  provider: string;
  providerSubscriptionId?: string;
  currency: string;
  amount: number;
  gracePeriodEndsAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ISubscriptionPayment {
  _id: string;
  organizationId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: SubscriptionPaymentStatusType;
  method: string;
  provider: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  paidAt?: Date | string;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ISubscriptionMandate {
  _id: string;
  organizationId: string;
  subscriptionId: string;
  provider: string;
  providerMandateId?: string;
  method: MandateMethodType;
  status: MandateStatusType;
  activatedAt?: Date | string;
  expiresAt?: Date | string;
  cancelledAt?: Date | string;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
}
