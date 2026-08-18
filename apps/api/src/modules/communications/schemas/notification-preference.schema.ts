import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationPreferenceDocument = NotificationPreference & Document;

@Schema({ _id: false })
export class WebPushKeys {
  @Prop({ required: true })
  p256dh!: string;

  @Prop({ required: true })
  auth!: string;
}

@Schema({ _id: false })
export class WebPushSubscriptionSchema {
  @Prop({ required: true })
  endpoint!: string;

  @Prop({ type: WebPushKeys, required: true })
  keys!: WebPushKeys;
}

@Schema({ timestamps: true, collection: 'notificationPreferences' })
export class NotificationPreference {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ default: true })
  membershipReminders!: boolean;

  @Prop({ default: true })
  paymentNotifications!: boolean;

  @Prop({ default: true })
  announcements!: boolean;

  @Prop({ type: WebPushSubscriptionSchema })
  webPushSubscription?: WebPushSubscriptionSchema;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);
NotificationPreferenceSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
