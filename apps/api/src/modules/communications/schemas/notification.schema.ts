import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  NOTIFICATION_TYPES,
  NotificationType,
  DELIVERY_STATUS,
  DeliveryStatusType,
} from '@klyro/config';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipientUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', index: true })
  customerId?: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(NOTIFICATION_TYPES) })
  type!: NotificationType;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ required: true, enum: Object.values(DELIVERY_STATUS), default: DELIVERY_STATUS.SENT, index: true })
  status!: DeliveryStatusType;

  @Prop({ type: Types.ObjectId, ref: 'Announcement' })
  announcementId?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ index: true })
  eventKey?: string;

  @Prop({ type: Date })
  scheduledAt?: Date;

  @Prop({ type: Date, default: Date.now })
  sentAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ organizationId: 1, recipientUserId: 1, readAt: 1 });
NotificationSchema.index({ organizationId: 1, eventKey: 1 }, { unique: true, sparse: true });
