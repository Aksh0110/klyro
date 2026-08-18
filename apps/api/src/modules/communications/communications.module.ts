import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Announcement, AnnouncementSchema } from './schemas/announcement.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationDelivery, NotificationDeliverySchema } from './schemas/notification-delivery.schema';
import { NotificationPreference, NotificationPreferenceSchema } from './schemas/notification-preference.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CustomerMembership, CustomerMembershipSchema } from '../memberships/schemas/customer-membership.schema';
import { Invoice, InvoiceSchema } from '../gym-billing/schemas/invoice.schema';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema';

import { InAppProvider } from './providers/in-app.provider';
import { WebPushProvider } from './providers/web-push.provider';
import { WhatsAppProviderStub } from './providers/whatsapp.provider.stub';

import { AudienceResolverService } from './services/audience-resolver.service';
import { NotificationService } from './services/notification.service';
import { AnnouncementsService } from './services/announcements.service';
import { AutomatedTriggersService } from './services/automated-triggers.service';
import { RetentionInsightService } from './services/retention-insight.service';

import { CommunicationsController } from './communications.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationDelivery.name, schema: NotificationDeliverySchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: User.name, schema: UserSchema },
      { name: CustomerMembership.name, schema: CustomerMembershipSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    UsersModule,
  ],
  controllers: [CommunicationsController],
  providers: [
    InAppProvider,
    WebPushProvider,
    WhatsAppProviderStub,
    AudienceResolverService,
    NotificationService,
    AnnouncementsService,
    AutomatedTriggersService,
    RetentionInsightService,
  ],
  exports: [
    NotificationService,
    AutomatedTriggersService,
    AnnouncementsService,
    RetentionInsightService,
  ],
})
export class CommunicationsModule {}
