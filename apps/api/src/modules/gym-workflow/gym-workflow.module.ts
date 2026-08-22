import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CustomerMembership, CustomerMembershipSchema } from '../memberships/schemas/customer-membership.schema';
import { Invoice, InvoiceSchema } from '../gym-billing/schemas/invoice.schema';
import { Payment, PaymentSchema } from '../gym-billing/schemas/payment.schema';
import { MembershipPlan, MembershipPlanSchema } from '../membership-plans/schemas/membership-plan.schema';
import { UsersModule } from '../users/users.module';
import { CustomersModule } from '../customers/customers.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { MembershipPlansModule } from '../membership-plans/membership-plans.module';
import { GymBillingModule } from '../gym-billing/gym-billing.module';
import { BranchesModule } from '../branches/branches.module';
import { CommunicationsModule } from '../communications/communications.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { GymWorkflowService } from './gym-workflow.service';
import { GymWorkflowController } from './gym-workflow.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: User.name, schema: UserSchema },
      { name: CustomerMembership.name, schema: CustomerMembershipSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: MembershipPlan.name, schema: MembershipPlanSchema },
    ]),
    UsersModule,
    CustomersModule,
    MembershipsModule,
    MembershipPlansModule,
    GymBillingModule,
    BranchesModule,
    CommunicationsModule,
    SubscriptionModule,
  ],
  controllers: [GymWorkflowController],

  providers: [GymWorkflowService],
  exports: [GymWorkflowService],
})
export class GymWorkflowModule {}
