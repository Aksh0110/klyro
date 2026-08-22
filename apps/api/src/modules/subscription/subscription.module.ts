import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { EntitlementService } from './entitlement.service';
import { EntitlementGuard } from './guards/entitlement.guard';
import { DevPaymentProvider } from './providers/dev-payment.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { SubscriptionPlan, SubscriptionPlanSchema } from './schemas/subscription-plan.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { SubscriptionPayment, SubscriptionPaymentSchema } from './schemas/subscription-payment.schema';
import { SubscriptionMandate, SubscriptionMandateSchema } from './schemas/subscription-mandate.schema';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPayment.name, schema: SubscriptionPaymentSchema },
      { name: SubscriptionMandate.name, schema: SubscriptionMandateSchema },
    ]),
    UsersModule,
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    EntitlementService,
    EntitlementGuard,
    DevPaymentProvider,
    RazorpayProvider,
  ],
  exports: [SubscriptionService, EntitlementService, EntitlementGuard],
})
export class SubscriptionModule {}
