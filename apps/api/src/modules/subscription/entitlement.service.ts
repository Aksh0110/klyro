import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SUBSCRIPTION_STATUS, DEFAULT_GRACE_PERIOD_DAYS } from '@klyro/config';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';

export interface EntitlementCheckResult {
  hasAccess: boolean;
  status: string;
  reason?: string;
}

@Injectable()
export class EntitlementService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
  ) {}

  async checkEntitlement(organizationId: string): Promise<EntitlementCheckResult> {
    const orgObjectId = new Types.ObjectId(organizationId);
    let subscription = await this.subscriptionModel.findOne({ organizationId: orgObjectId }).exec();

    if (!subscription) {
      const isDevMode =
        process.env.KLYRO_BILLING_MODE === 'development' ||
        process.env.NODE_ENV !== 'production';

      if (isDevMode) {
        // In development mode, auto-provision an active Growth subscription for seamless local development
        const growthPlan =
          (await this.planModel.findOne({ code: 'GROWTH' }).exec()) ||
          (await this.planModel.findOne({}).exec());

        if (growthPlan) {
          const now = new Date();
          const periodEnd = new Date(now);
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);

          subscription = await this.subscriptionModel.create({
            organizationId: orgObjectId,
            subscriptionPlanId: growthPlan._id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            provider: 'DEV_PROVIDER',
            currency: 'INR',
            amount: growthPlan.monthlyPrice,
          });

          return { hasAccess: true, status: SUBSCRIPTION_STATUS.ACTIVE };
        }
      }

      // New organizations without active subscription are in PENDING_PAYMENT state
      return {
        hasAccess: false,
        status: SUBSCRIPTION_STATUS.PENDING_PAYMENT,
        reason: 'Organization requires a Klyro subscription setup',
      };
    }

    if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
      return { hasAccess: true, status: SUBSCRIPTION_STATUS.ACTIVE };
    }

    if (subscription.status === SUBSCRIPTION_STATUS.PAST_DUE) {
      const graceEnd = subscription.gracePeriodEndsAt
        ? new Date(subscription.gracePeriodEndsAt)
        : new Date(Date.now() + DEFAULT_GRACE_PERIOD_DAYS * 86400000);

      if (Date.now() <= graceEnd.getTime()) {
        return {
          hasAccess: true,
          status: SUBSCRIPTION_STATUS.PAST_DUE,
          reason: 'Account is past due but within grace period',
        };
      } else {
        return {
          hasAccess: false,
          status: SUBSCRIPTION_STATUS.EXPIRED,
          reason: 'Subscription payment failed and grace period has expired',
        };
      }
    }

    if (
      subscription.status === SUBSCRIPTION_STATUS.PENDING_PAYMENT ||
      subscription.status === SUBSCRIPTION_STATUS.PENDING_AUTOPAY
    ) {
      return {
        hasAccess: false,
        status: subscription.status,
        reason: 'Subscription payment or AutoPay setup pending',
      };
    }

    return {
      hasAccess: false,
      status: subscription.status,
      reason: 'Subscription is inactive or expired',
    };
  }
}
