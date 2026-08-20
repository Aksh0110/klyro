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
    let subscription = await this.subscriptionModel.findOne({ organizationId: orgObjectId }).exec();

    // Auto-provision or activate subscription so organization has active lifetime access
    if (!subscription || subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
      let growthPlan =
        (await this.planModel.findOne({ code: 'GROWTH' }).exec()) ||
        (await this.planModel.findOne({}).exec());

      if (!growthPlan) {
        growthPlan = await this.planModel.create({
          name: 'Growth Plan',
          code: 'GROWTH',
          monthlyPrice: 1999,
          yearlyPrice: 19990,
          currency: 'INR',
          features: ['Unlimited Members', 'Attendance', 'Billing', 'Communications'],
          isActive: true,
        });
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 10);

      if (!subscription) {
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
      } else {
        subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
        subscription.currentPeriodEnd = periodEnd;
        await subscription.save();
      }
    }

    return { hasAccess: true, status: SUBSCRIPTION_STATUS.ACTIVE };
  }
}
