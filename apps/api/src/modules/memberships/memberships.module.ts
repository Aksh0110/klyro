import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerMembership, CustomerMembershipSchema } from './schemas/customer-membership.schema';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { CustomersModule } from '../customers/customers.module';
import { MembershipPlansModule } from '../membership-plans/membership-plans.module';
import { BranchesModule } from '../branches/branches.module';
import { UsersModule } from '../users/users.module';
import { GymBillingModule } from '../gym-billing/gym-billing.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CustomerMembership.name, schema: CustomerMembershipSchema },
    ]),
    CustomersModule,
    MembershipPlansModule,
    BranchesModule,
    UsersModule,
    GymBillingModule,
    SubscriptionModule,
  ],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}

