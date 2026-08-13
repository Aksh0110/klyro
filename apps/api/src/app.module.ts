import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CustomersModule } from './modules/customers/customers.module';
import { MembershipPlansModule } from './modules/membership-plans/membership-plans.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { GymBillingModule } from './modules/gym-billing/gym-billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/klyro',
      }),
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    BranchesModule,
    CustomersModule,
    MembershipPlansModule,
    MembershipsModule,
    SubscriptionModule,
    GymBillingModule,
  ],
})
export class AppModule {}
