import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomerMembership } from '../modules/memberships/schemas/customer-membership.schema';
import { Invoice } from '../modules/gym-billing/schemas/invoice.schema';
import { GymBillingService } from '../modules/gym-billing/gym-billing.service';

async function bootstrap() {
  console.log('🚀 Starting Idempotent Membership Invoice Backfill Script...');

  const app = await NestFactory.createApplicationContext(AppModule);

  const membershipModel: Model<any> = app.get(getModelToken(CustomerMembership.name));
  const invoiceModel: Model<any> = app.get(getModelToken(Invoice.name));
  const gymBillingService = app.get(GymBillingService);

  const memberships = await membershipModel.find().exec();
  console.log(`Found ${memberships.length} total customer memberships in database.`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const memb of memberships) {
    const existingInvoice = await invoiceModel.findOne({ membershipId: memb._id }).exec();

    if (existingInvoice) {
      skippedCount++;
    } else {
      console.log(`Generating missing invoice for Membership ${memb._id} (Org ${memb.organizationId})...`);
      await gymBillingService.createInvoiceForMembership(
        memb.organizationId.toString(),
        memb.branchId.toString(),
        memb.customerId.toString(),
        memb._id.toString(),
        memb.price || 0,
        memb.endDate || new Date(),
      );
      createdCount++;
    }
  }

  console.log(`\n✅ Backfill Completed!`);
  console.log(`- Created Invoices: ${createdCount}`);
  console.log(`- Skipped (Already Exists): ${skippedCount}`);

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Backfill Script Failed:', err);
  process.exit(1);
});
