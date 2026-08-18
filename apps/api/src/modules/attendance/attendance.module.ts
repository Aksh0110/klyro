import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { CustomerMembership, CustomerMembershipSchema } from '../memberships/schemas/customer-membership.schema';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { MembershipAccessService } from './services/membership-access.service';
import { GpsValidationService } from './services/gps-validation.service';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: CustomerMembership.name, schema: CustomerMembershipSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, MembershipAccessService, GpsValidationService],
  exports: [AttendanceService, MembershipAccessService, GpsValidationService],
})
export class AttendanceModule {}
