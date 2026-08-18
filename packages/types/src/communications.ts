export const AUDIENCE_TYPES = {
  ALL_MEMBERS: 'ALL_MEMBERS',
  BRANCH_MEMBERS: 'BRANCH_MEMBERS',
} as const;

export type AudienceType = (typeof AUDIENCE_TYPES)[keyof typeof AUDIENCE_TYPES];

export const ANNOUNCEMENT_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  CANCELLED: 'CANCELLED',
} as const;

export type AnnouncementStatusType = (typeof ANNOUNCEMENT_STATUS)[keyof typeof ANNOUNCEMENT_STATUS];

export const NOTIFICATION_TYPES = {
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  MEMBERSHIP_EXPIRING: 'MEMBERSHIP_EXPIRING',
  MEMBERSHIP_EXPIRED: 'MEMBERSHIP_EXPIRED',
  MEMBERSHIP_ACTIVATED: 'MEMBERSHIP_ACTIVATED',
  INVOICE_DUE: 'INVOICE_DUE',
  INVOICE_OVERDUE: 'INVOICE_OVERDUE',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  MEMBER_INACTIVE: 'MEMBER_INACTIVE',
  WELCOME: 'WELCOME',
  SYSTEM: 'SYSTEM',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const DELIVERY_CHANNELS = {
  IN_APP: 'IN_APP',
  WEB_PUSH: 'WEB_PUSH',
  WHATSAPP: 'WHATSAPP',
  SMS: 'SMS',
  EMAIL: 'EMAIL',
} as const;

export type DeliveryChannelType = (typeof DELIVERY_CHANNELS)[keyof typeof DELIVERY_CHANNELS];

export const DELIVERY_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  READ: 'READ',
} as const;

export type DeliveryStatusType = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

export interface IAnnouncement {
  _id: string;
  organizationId: string;
  branchId?: string;
  createdBy: string;
  title: string;
  body: string;
  audienceType: AudienceType;
  status: AnnouncementStatusType;
  channels: DeliveryChannelType[];
  scheduledAt?: Date | string;
  publishedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface INotification {
  _id: string;
  organizationId: string;
  recipientUserId: string;
  customerId?: string;
  type: NotificationType;
  title: string;
  body: string;
  status: DeliveryStatusType;
  announcementId?: string;
  metadata?: Record<string, any>;
  eventKey?: string;
  scheduledAt?: Date | string;
  sentAt?: Date | string;
  readAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface INotificationDelivery {
  _id: string;
  organizationId: string;
  notificationId: string;
  channel: DeliveryChannelType;
  status: DeliveryStatusType;
  providerMessageId?: string;
  errorDetails?: string;
  sentAt?: Date | string;
  createdAt: Date | string;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface INotificationPreference {
  _id: string;
  organizationId: string;
  userId: string;
  membershipReminders: boolean;
  paymentNotifications: boolean;
  announcements: boolean;
  webPushSubscription?: WebPushSubscription;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RetentionAttentionItem {
  customerId: string;
  customerName: string;
  phone?: string;
  lastVisitAt?: Date | string;
  daysInactive?: number;
  expiringDaysLeft?: number;
  membershipExpiryDate?: Date | string;
  overdueAmount?: number;
  attentionType: 'EXPIRING' | 'OVERDUE' | 'INACTIVE' | 'HIGH_ATTENTION';
}

export interface RetentionAttentionSummary {
  expiringCount: number;
  expiringAmountAtRisk: number;
  overdueCount: number;
  overdueAmountTotal: number;
  inactiveCount: number;
  scheduledAnnouncementsCount: number;
  attentionItems: RetentionAttentionItem[];
}
