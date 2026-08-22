import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SUBSCRIPTION_STATUS } from '@klyro/config';
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
    const subscription = await this.subscriptionModel.findOne({ organizationId: orgObjectId }).exec();

    if (!subscription) {
      return {
        hasAccess: false,
        status: SUBSCRIPTION_STATUS.PENDING_PAYMENT,
        reason: 'No subscription found. Payment or active plan required to access app.',
      };
    }

    const now = new Date();

    // 1. ACTIVE Subscription (Requires successful payment)
    if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
      if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now) {
        subscription.status = SUBSCRIPTION_STATUS.PAST_DUE;
        await subscription.save();
        return {
          hasAccess: false,
          status: SUBSCRIPTION_STATUS.PAST_DUE,
          reason: 'Subscription period has expired. Payment required to continue.',
        };
      }
      return { hasAccess: true, status: subscription.status };
    }


    // 2. TRIAL Subscription
    if (subscription.status === SUBSCRIPTION_STATUS.TRIAL) {
      if (subscription.trialEndsAt && new Date(subscription.trialEndsAt) < now) {
        subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
        await subscription.save();
        return {
          hasAccess: false,
          status: SUBSCRIPTION_STATUS.EXPIRED,
          reason: 'Free trial has expired. Payment required to continue.',
        };
      }
      return { hasAccess: true, status: SUBSCRIPTION_STATUS.TRIAL };
    }

    // 3. INACTIVE / PENDING_PAYMENT / EXPIRED / CANCELLED
    return {
      hasAccess: false,
      status: subscription.status,
      reason: `Subscription is ${subscription.status}. Payment required to access Klyro SaaS platform.`,
    };
  }
}
