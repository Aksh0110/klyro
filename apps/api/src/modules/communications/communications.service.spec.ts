import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Announcement } from './schemas/announcement.schema';
import { Notification } from './schemas/notification.schema';
import { NotificationDelivery } from './schemas/notification-delivery.schema';
import { NotificationPreference } from './schemas/notification-preference.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { User } from '../users/schemas/user.schema';
import { CustomerMembership } from '../memberships/schemas/customer-membership.schema';
import { Invoice } from '../gym-billing/schemas/invoice.schema';
import { Attendance } from '../attendance/schemas/attendance.schema';
import { AudienceResolverService } from './services/audience-resolver.service';
import { NotificationService } from './services/notification.service';
import { AnnouncementsService } from './services/announcements.service';
import { RetentionInsightService } from './services/retention-insight.service';
import { InAppProvider } from './providers/in-app.provider';
import { WebPushProvider } from './providers/web-push.provider';
import { WhatsAppProviderStub } from './providers/whatsapp.provider.stub';
import { AUDIENCE_TYPES, NOTIFICATION_TYPES } from '@klyro/config';

describe('CommunicationsModule Unit Tests', () => {
  let audienceResolver: AudienceResolverService;
  let notificationService: NotificationService;
  let announcementsService: AnnouncementsService;

  const mockOrgId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();
  const mockBranchId = new Types.ObjectId().toString();
  const mockCustomerId = new Types.ObjectId().toString();

  const mockCustomerModel = {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: new Types.ObjectId(mockCustomerId), userId: new Types.ObjectId(mockUserId), phone: '+919876543210' },
      ]),
      exec: jest.fn().mockResolvedValue([
        { _id: new Types.ObjectId(mockCustomerId), firstName: 'John', status: 'ACTIVE', phone: '+919876543210' },
      ]),
    }),
  };

  const mockUserModel = {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: new Types.ObjectId(mockUserId), phone: '+919876543210' },
      ]),
    }),
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(mockUserId), phone: '+919876543210' }),
    }),
  };

  const mockAnnouncementSave = jest.fn();
  const mockAnnouncementModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: new Types.ObjectId(),
    save: mockAnnouncementSave,
  }));
  mockAnnouncementModel.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
  });
  mockAnnouncementModel.findOne = jest.fn();
  mockAnnouncementModel.countDocuments = jest.fn().mockResolvedValue(1);

  const mockNotificationSave = jest.fn();
  const mockNotificationModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    _id: new Types.ObjectId(),
    save: mockNotificationSave,
  }));
  mockNotificationModel.findOne = jest.fn();
  mockNotificationModel.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    }),
  });
  mockNotificationModel.countDocuments = jest.fn().mockResolvedValue(0);

  const mockDeliveryModel = {
    create: jest.fn().mockResolvedValue({}),
  };

  const mockPreferenceSave = jest.fn();
  const mockPreferenceModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  const mockMembershipModel = {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    }),
  };

  const mockInvoiceModel = {
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    }),
  };

  const mockAttendanceModel = {
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
    findOne: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudienceResolverService,
        NotificationService,
        AnnouncementsService,
        RetentionInsightService,
        InAppProvider,
        WebPushProvider,
        WhatsAppProviderStub,
        { provide: getModelToken(Announcement.name), useValue: mockAnnouncementModel },
        { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
        { provide: getModelToken(NotificationDelivery.name), useValue: mockDeliveryModel },
        { provide: getModelToken(NotificationPreference.name), useValue: mockPreferenceModel },
        { provide: getModelToken(Customer.name), useValue: mockCustomerModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(CustomerMembership.name), useValue: mockMembershipModel },
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
        { provide: getModelToken(Attendance.name), useValue: mockAttendanceModel },
      ],
    }).compile();

    audienceResolver = module.get<AudienceResolverService>(AudienceResolverService);
    notificationService = module.get<NotificationService>(NotificationService);
    announcementsService = module.get<AnnouncementsService>(AnnouncementsService);

    jest.clearAllMocks();
  });

  describe('AudienceResolverService', () => {
    it('should resolve ALL_MEMBERS audience correctly', async () => {
      const result = await audienceResolver.resolveAudience(mockOrgId, AUDIENCE_TYPES.ALL_MEMBERS);
      expect(result).toHaveLength(1);
      expect(result[0].userId.toString()).toBe(mockUserId);
    });
  });

  describe('NotificationService & Idempotency', () => {
    it('should prevent duplicate notification when eventKey exists', async () => {
      const existingNotif = { _id: 'existing123', eventKey: 'dup_key' } as any;
      mockNotificationModel.findOne.mockResolvedValueOnce(existingNotif);
      mockPreferenceModel.findOne.mockResolvedValueOnce({
        membershipReminders: true,
        paymentNotifications: true,
        announcements: true,
      });

      const res = await notificationService.createNotification({
        organizationId: mockOrgId,
        recipientUserId: mockUserId,
        type: NOTIFICATION_TYPES.ANNOUNCEMENT,
        title: 'Test Title',
        body: 'Test Body',
        eventKey: 'dup_key',
      });

      expect(res).toBe(existingNotif);
    });
  });

  describe('AnnouncementsService', () => {
    it('should create draft announcement for NOW publish', async () => {
      mockAnnouncementSave.mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        title: 'Gym Notice',
        status: 'DRAFT',
      });

      const res = await announcementsService.createAnnouncement(
        { id: mockUserId },
        mockOrgId,
        {
          title: 'Gym Notice',
          body: 'Gym will be open tomorrow',
          audienceType: 'ALL_MEMBERS',
        },
      );

      expect(res).toBeDefined();
    });
  });
});
