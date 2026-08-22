import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembershipPlan, MembershipPlanSchema } from './schemas/membership-plan.schema';
import { MembershipPlansService } from './membership-plans.service';
import { MembershipPlansController } from './membership-plans.controller';
import { UsersModule } from '../users/users.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MembershipPlan.name, schema: MembershipPlanSchema }]),
    UsersModule,
    SubscriptionModule,
  ],
  controllers: [MembershipPlansController],
  providers: [MembershipPlansService],
  exports: [MembershipPlansService],
})
export class MembershipPlansModule {}

