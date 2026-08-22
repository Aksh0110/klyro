import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PAYMENT_STATUS,
  MANDATE_STATUS,
  MANDATE_METHOD,
  PLAN_STATUS,
  DEFAULT_GRACE_PERIOD_DAYS,
} from '@klyro/config';
import { CheckoutSubscriptionDto, SetupAutopayDto } from '@klyro/validation';
import { SubscriptionPlan, SubscriptionPlanDocument } from './schemas/subscription-plan.schema';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { SubscriptionPayment, SubscriptionPaymentDocument } from './schemas/subscription-payment.schema';
import { SubscriptionMandate, SubscriptionMandateDocument } from './schemas/subscription-mandate.schema';
import { PaymentProvider } from './providers/payment-provider.interface';
import { DevPaymentProvider } from './providers/dev-payment.provider';
import { RazorpayProvider } from './providers/razorpay.provider';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private provider: PaymentProvider;

  constructor(
    @InjectModel(SubscriptionPlan.name)
    private readonly planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(Subscription.name)
    private readonly subModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPayment.name)
    private readonly subPaymentModel: Model<SubscriptionPaymentDocument>,
    @InjectModel(SubscriptionMandate.name)
    private readonly mandateModel: Model<SubscriptionMandateDocument>,
    private readonly configService: ConfigService,
    private readonly devProvider: DevPaymentProvider,
    private readonly razorpayProvider: RazorpayProvider,
  ) {
    const mode =
      this.configService.get<string>('KLYRO_BILLING_MODE') ||
      (process.env.NODE_ENV !== 'production' ? 'development' : 'razorpay');

    if (mode === 'development') {
      this.provider = this.devProvider;
    } else {
      this.provider = this.razorpayProvider;
    }
  }

  async onModuleInit() {
    await this.seedDefaultPlans();
  }

  private async seedDefaultPlans() {
    const defaultPlans = [
      {
        name: 'Starter',
        code: 'STARTER',
        description: 'Ideal for single-branch fitness studios',
        monthlyPrice: 499,
        memberLimit: 100,
        features: { attendance: true, reports: true, staff: true, renewalReminders: true },
      },
      {
        name: 'Growth',
        code: 'GROWTH',
        description: 'Perfect for growing gyms & club facilities',
        monthlyPrice: 799,
        memberLimit: 500,
        features: { attendance: true, reports: true, staff: true, renewalReminders: true },
      },
      {
        name: 'Pro',
        code: 'PRO',
        description: 'Full-featured enterprise operational plan',
        monthlyPrice: 1199,
        memberLimit: 2000,
        features: { attendance: true, reports: true, staff: true, renewalReminders: true },
      },
    ];

    for (const plan of defaultPlans) {
      await this.planModel.updateOne(
        { code: plan.code },
        { $set: { ...plan, status: PLAN_STATUS.ACTIVE, currency: 'INR' } },
        { upsert: true },
      );
    }
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlanDocument[]> {
    let plans = await this.planModel.find({ status: PLAN_STATUS.ACTIVE }).exec();
    if (!plans || plans.length === 0) {
      await this.seedDefaultPlans();
      plans = await this.planModel.find({ status: PLAN_STATUS.ACTIVE }).exec();
    }
    return plans;
  }

  async startFreeTrial(organizationId: string, planCode?: string) {
    const orgObjectId = new Types.ObjectId(organizationId);

    const plan =
      (await this.planModel.findOne({ code: planCode || 'GROWTH' }).exec()) ||
      (await this.planModel.findOne({}).exec());

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60-day free trial

    let subscription = await this.subModel.findOne({ organizationId: orgObjectId }).exec();

    if (subscription) {
      subscription.subscriptionPlanId = plan._id;
      subscription.status = SUBSCRIPTION_STATUS.TRIAL;
      subscription.trialEndsAt = trialEndsAt;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = trialEndsAt;
      await subscription.save();
    } else {
      subscription = await this.subModel.create({
        organizationId: orgObjectId,
        subscriptionPlanId: plan._id,
        status: SUBSCRIPTION_STATUS.TRIAL,
        startedAt: now,
        trialEndsAt: trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        cancelAtPeriodEnd: false,
        provider: 'FREE_TRIAL',
        currency: 'INR',
        amount: 0,
      });
    }

    return {
      subscription,
      message: '60-day free trial activated successfully!',
    };
  }

  async getCurrentSubscription(organizationId: string) {
    const orgObjectId = new Types.ObjectId(organizationId);

    const subscription = await this.subModel
      .findOne({ organizationId: orgObjectId })
      .populate('subscriptionPlanId')
      .exec();

    const mandate = subscription
      ? await this.mandateModel.findOne({ subscriptionId: subscription._id }).exec()
      : null;

    return {
      subscription,
      mandate,
      billingMode: this.provider.name,
    };
  }

  async checkout(organizationId: string, dto: CheckoutSubscriptionDto) {
    const orgObjectId = new Types.ObjectId(organizationId);

    const plan = await this.planModel.findById(dto.subscriptionPlanId).exec();
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const providerRes = await this.provider.createSubscription(plan.code, plan.monthlyPrice);

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    let subscription = await this.subModel.findOne({ organizationId: orgObjectId }).exec();

    if (subscription) {
      subscription.subscriptionPlanId = plan._id;
      subscription.status = SUBSCRIPTION_STATUS.PENDING_PAYMENT;
      subscription.amount = plan.monthlyPrice;
      subscription.providerSubscriptionId = providerRes.providerSubscriptionId;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = periodEnd;
      await subscription.save();
    } else {
      subscription = await this.subModel.create({
        organizationId: orgObjectId,
        subscriptionPlanId: plan._id,
        status: SUBSCRIPTION_STATUS.PENDING_PAYMENT,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        provider: this.provider.name,
        providerSubscriptionId: providerRes.providerSubscriptionId,
        currency: 'INR',
        amount: plan.monthlyPrice,
      });
    }

    // Process initial payment
    const paymentRes = await this.provider.createInitialPayment(
      subscription._id.toString(),
      plan.monthlyPrice,
    );

    const payment = await this.subPaymentModel.create({
      organizationId: orgObjectId,
      subscriptionId: subscription._id,
      amount: plan.monthlyPrice,
      currency: 'INR',
      status: paymentRes.status === 'SUCCESS' ? SUBSCRIPTION_PAYMENT_STATUS.SUCCESS : SUBSCRIPTION_PAYMENT_STATUS.FAILED,
      method: this.provider.name,
      provider: this.provider.name,
      providerPaymentId: paymentRes.providerPaymentId,
      providerOrderId: paymentRes.providerOrderId,
      paidAt: paymentRes.status === 'SUCCESS' ? new Date() : undefined,
    });

    if (paymentRes.status === 'SUCCESS') {
      subscription.status = SUBSCRIPTION_STATUS.PENDING_AUTOPAY;
      await subscription.save();
    }

    return {
      subscription,
      payment,
      checkoutUrl: providerRes.checkoutUrl,
    };
  }

  async setupAutopay(organizationId: string, dto: SetupAutopayDto) {
    const orgObjectId = Types.ObjectId.isValid(organizationId) ? new Types.ObjectId(organizationId) : null;

    let subscription = orgObjectId ? await this.subModel.findOne({ organizationId: orgObjectId }).exec() : null;
    if (!subscription && (dto as any).orderId) {
      subscription = await this.subModel.findOne({ providerSubscriptionId: (dto as any).orderId }).exec();
    }

    if (!subscription) {
      // Fallback: lookup most recent subscription or auto-provision
      subscription = await this.subModel.findOne({}).sort({ createdAt: -1 }).exec();
    }

    if (!subscription) {
      throw new BadRequestException('No subscription record found. Please initiate checkout first.');
    }

    const mandateRes = await this.provider.createMandate(subscription._id.toString(), dto.method);

    let mandate = await this.mandateModel.findOne({ subscriptionId: subscription._id }).exec();

    if (mandate) {
      mandate.method = dto.method;
      mandate.status = mandateRes.status === 'ACTIVE' ? MANDATE_STATUS.ACTIVE : MANDATE_STATUS.PENDING;
      mandate.providerMandateId = mandateRes.providerMandateId;
      mandate.activatedAt = mandateRes.status === 'ACTIVE' ? new Date() : undefined;
      await mandate.save();
    } else {
      mandate = await this.mandateModel.create({
        organizationId: orgObjectId,
        subscriptionId: subscription._id,
        provider: this.provider.name,
        providerMandateId: mandateRes.providerMandateId,
        method: dto.method,
        status: mandateRes.status === 'ACTIVE' ? MANDATE_STATUS.ACTIVE : MANDATE_STATUS.PENDING,
        activatedAt: mandateRes.status === 'ACTIVE' ? new Date() : undefined,
      });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
    subscription.startedAt = subscription.startedAt || now;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = periodEnd;
    await subscription.save();

    if ((dto as any).paymentId) {
      await this.subPaymentModel.create({
        organizationId: orgObjectId,
        subscriptionId: subscription._id,
        amount: subscription.amount || 799,
        currency: 'INR',
        status: 'SUCCESS',
        provider: this.provider.name,
        providerPaymentId: (dto as any).paymentId,
        providerOrderId: (dto as any).orderId,
        paidAt: now,
      });
    }

    return {
      subscription,
      mandate,
    };
  }

  async cancelSubscription(organizationId: string) {
    const orgObjectId = new Types.ObjectId(organizationId);
    const subscription = await this.subModel.findOne({ organizationId: orgObjectId }).exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    if (subscription.providerSubscriptionId) {
      await this.provider.cancelSubscription(subscription.providerSubscriptionId);
    }

    return subscription;
  }

  async getPayments(organizationId: string) {
    const orgObjectId = new Types.ObjectId(organizationId);
    return this.subPaymentModel.find({ organizationId: orgObjectId }).sort({ createdAt: -1 }).exec();
  }

  async handleRazorpayWebhook(payload: any): Promise<void> {
    this.logger.log(`Handling Razorpay webhook event: ${payload?.event}`);

    const event = payload?.event;
    const providerSubId = payload?.payload?.subscription?.entity?.id || payload?.payload?.subscription?.id;

    if (providerSubId) {
      const sub = await this.subModel.findOne({ providerSubscriptionId: providerSubId }).exec();
      if (sub) {
        if (event === 'subscription.charged' || event === 'subscription.authenticated' || payload?.code === 'PAYMENT_SUCCESS') {
          sub.status = SUBSCRIPTION_STATUS.ACTIVE;
          const nextStart = new Date(sub.currentPeriodEnd);
          const nextEnd = new Date(nextStart);
          nextEnd.setMonth(nextEnd.getMonth() + 1);
          sub.currentPeriodStart = nextStart;
          sub.currentPeriodEnd = nextEnd;
          await sub.save();
        } else if (event === 'subscription.halted' || event === 'payment.failed') {
          sub.status = SUBSCRIPTION_STATUS.PAST_DUE;
          sub.gracePeriodEndsAt = new Date(Date.now() + DEFAULT_GRACE_PERIOD_DAYS * 86400000);
          await sub.save();
        }
      }
    }
  }
}
