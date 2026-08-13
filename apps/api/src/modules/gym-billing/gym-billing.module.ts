import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GymBillingController } from './gym-billing.controller';
import { GymBillingService } from './gym-billing.service';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Counter, CounterSchema } from './schemas/counter.schema';
import { CustomerMembership, CustomerMembershipSchema } from '../memberships/schemas/customer-membership.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UsersModule } from '../users/users.module';
import { CustomersModule } from '../customers/customers.module';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: CustomerMembership.name, schema: CustomerMembershipSchema },
    ]),
    SubscriptionModule,
    UsersModule,
    CustomersModule,
    BranchesModule,
  ],
  controllers: [GymBillingController],
  providers: [GymBillingService],
  exports: [GymBillingService],
})
export class GymBillingModule {}
