import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { NotificationDelivery, NotificationDeliveryDocument } from '../schemas/notification-delivery.schema';
import { NotificationPreference, NotificationPreferenceDocument } from '../schemas/notification-preference.schema';
import { InAppProvider } from '../providers/in-app.provider';
import { WebPushProvider } from '../providers/web-push.provider';
import { WhatsAppProviderStub } from '../providers/whatsapp.provider.stub';
import {
  DELIVERY_CHANNELS,
  DELIVERY_STATUS,
  NOTIFICATION_TYPES,
  NotificationType,
} from '@klyro/config';
import { UpdateNotificationPreferenceDto, SavePushSubscriptionDto } from '@klyro/validation';

export interface CreateNotificationPayload {
  organizationId: string | Types.ObjectId;
  recipientUserId: string | Types.ObjectId;
  customerId?: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  announcementId?: string | Types.ObjectId;
  metadata?: Record<string, any>;
  eventKey?: string;
  channels?: string[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationDelivery.name) private deliveryModel: Model<NotificationDeliveryDocument>,
    @InjectModel(NotificationPreference.name) private prefModel: Model<NotificationPreferenceDocument>,
    private readonly inAppProvider: InAppProvider,
    private readonly webPushProvider: WebPushProvider,
    private readonly whatsappProvider: WhatsAppProviderStub,
  ) {}

  async createNotification(payload: CreateNotificationPayload): Promise<NotificationDocument | null> {
    const res = await this.createNotificationWithResult(payload);
    return res.notification;
  }

  async createNotificationWithResult(
    payload: CreateNotificationPayload,
  ): Promise<{ notification: NotificationDocument | null; created: boolean; isDuplicate: boolean }> {
    const orgObjectId = new Types.ObjectId(payload.organizationId);
    const recipientObjectId = new Types.ObjectId(payload.recipientUserId);

    // 1. Idempotency duplicate check
    if (payload.eventKey) {
      const existing = await this.notificationModel.findOne({
        organizationId: orgObjectId,
        eventKey: payload.eventKey,
      });
      if (existing) {
        this.logger.log(`Idempotent duplicate caught for key ${payload.eventKey}, skipping duplicate notification`);
        return { notification: existing, created: false, isDuplicate: true };
      }
    }

    // 2. Check user notification preferences
    const preference = await this.getOrCreatePreference(recipientObjectId, orgObjectId);
    if (!this.isCategoryEnabled(payload.type, preference)) {
      this.logger.log(`User ${payload.recipientUserId} disabled notifications for type ${payload.type}`);
      return { notification: null, created: false, isDuplicate: false };
    }

    // 3. Create Notification document
    const notification = new this.notificationModel({
      organizationId: orgObjectId,
      recipientUserId: recipientObjectId,
      customerId: payload.customerId ? new Types.ObjectId(payload.customerId) : undefined,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      status: DELIVERY_STATUS.SENT,
      announcementId: payload.announcementId ? new Types.ObjectId(payload.announcementId) : undefined,
      metadata: payload.metadata,
      eventKey: payload.eventKey,
      sentAt: new Date(),
    });

    try {
      await notification.save();
    } catch (err: any) {
      if (err.code === 11000 && payload.eventKey) {
        this.logger.log(`Duplicate eventKey race condition caught: ${payload.eventKey}`);
        const existing = await this.notificationModel.findOne({ organizationId: orgObjectId, eventKey: payload.eventKey });
        return { notification: existing, created: false, isDuplicate: true };
      }
      throw err;
    }

    // 4. Dispatch to delivery providers asynchronously
    const targetChannels = payload.channels || [DELIVERY_CHANNELS.IN_APP, DELIVERY_CHANNELS.WEB_PUSH];
    await this.dispatchDeliveries(notification, preference, targetChannels);

    return { notification, created: true, isDuplicate: false };
  }

  private isCategoryEnabled(type: NotificationType, pref: NotificationPreferenceDocument): boolean {
    if (type === NOTIFICATION_TYPES.ANNOUNCEMENT) {
      return pref.announcements !== false;
    }
    if (
      type === NOTIFICATION_TYPES.MEMBERSHIP_EXPIRING ||
      type === NOTIFICATION_TYPES.MEMBERSHIP_EXPIRED ||
      type === NOTIFICATION_TYPES.MEMBERSHIP_ACTIVATED
    ) {
      return pref.membershipReminders !== false;
    }
    if (
      type === NOTIFICATION_TYPES.INVOICE_DUE ||
      type === NOTIFICATION_TYPES.INVOICE_OVERDUE ||
      type === NOTIFICATION_TYPES.PAYMENT_RECEIVED
    ) {
      return pref.paymentNotifications !== false;
    }
    return true;
  }

  private async dispatchDeliveries(
    notification: NotificationDocument,
    preference: NotificationPreferenceDocument,
    channels: string[],
  ) {
    const providers = [
      this.inAppProvider,
      this.webPushProvider,
      this.whatsappProvider,
    ];

    for (const p of providers) {
      if (channels.includes(p.channel)) {
        try {
          const res = await p.send(notification, preference);
          await this.deliveryModel.create({
            organizationId: notification.organizationId,
            notificationId: notification._id,
            channel: p.channel,
            status: res.status,
            providerMessageId: res.providerMessageId,
            errorDetails: res.errorDetails,
            sentAt: new Date(),
          });
        } catch (err: any) {
          this.logger.error(`Error sending via ${p.channel}`, err);
        }
      }
    }
  }

  async getMyNotifications(userId: string | Types.ObjectId, organizationId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        recipientUserId: new Types.ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  async getUnreadCount(userId: string | Types.ObjectId, organizationId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      organizationId: new Types.ObjectId(organizationId),
      recipientUserId: new Types.ObjectId(userId),
      readAt: { $exists: false },
    });
  }

  async markAsRead(notificationId: string, userId: string, organizationId: string): Promise<NotificationDocument> {
    const notif = await this.notificationModel.findOne({
      _id: new Types.ObjectId(notificationId),
      organizationId: new Types.ObjectId(organizationId),
      recipientUserId: new Types.ObjectId(userId),
    });

    if (!notif) {
      throw new NotFoundException('Notification not found');
    }

    notif.readAt = new Date();
    notif.status = DELIVERY_STATUS.READ;
    return notif.save();
  }

  async getOrCreatePreference(userId: string | Types.ObjectId, organizationId: string | Types.ObjectId): Promise<NotificationPreferenceDocument> {
    const userObjId = new Types.ObjectId(userId);
    const orgObjId = new Types.ObjectId(organizationId);
    let pref = await this.prefModel.findOne({ organizationId: orgObjId, userId: userObjId });
    if (!pref) {
      pref = await this.prefModel.create({
        organizationId: orgObjId,
        userId: userObjId,
        membershipReminders: true,
        paymentNotifications: true,
        announcements: true,
      });
    }
    return pref;
  }

  async updatePreferences(
    userId: string,
    organizationId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceDocument> {
    const userObjId = new Types.ObjectId(userId);
    const orgObjId = new Types.ObjectId(organizationId);

    const pref = await this.getOrCreatePreference(userObjId, orgObjId);
    if (dto.membershipReminders !== undefined) pref.membershipReminders = dto.membershipReminders;
    if (dto.paymentNotifications !== undefined) pref.paymentNotifications = dto.paymentNotifications;
    if (dto.announcements !== undefined) pref.announcements = dto.announcements;

    return pref.save();
  }

  async savePushSubscription(
    userId: string,
    organizationId: string,
    dto: SavePushSubscriptionDto,
  ): Promise<NotificationPreferenceDocument> {
    const userObjId = new Types.ObjectId(userId);
    const orgObjId = new Types.ObjectId(organizationId);

    const pref = await this.getOrCreatePreference(userObjId, orgObjId);
    pref.webPushSubscription = dto.subscription as any;
    return pref.save();
  }
}
