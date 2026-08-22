import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  DELIVERY_CHANNELS,
  DeliveryChannelType,
  DELIVERY_STATUS,
  DeliveryStatusType,
} from '@klyro/config';

export type NotificationDeliveryDocument = NotificationDelivery & Document;

@Schema({ timestamps: true, collection: 'notificationDeliveries' })
export class NotificationDelivery {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Notification', required: true, index: true })
  notificationId!: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(DELIVERY_CHANNELS) })
  channel!: DeliveryChannelType;

  @Prop({ required: true, enum: Object.values(DELIVERY_STATUS), default: DELIVERY_STATUS.PENDING, index: true })
  status!: DeliveryStatusType;

  @Prop()
  providerMessageId?: string;

  @Prop()
  errorDetails?: string;

  @Prop({ type: Date })
  sentAt?: Date;
}

export const NotificationDeliverySchema = SchemaFactory.createForClass(NotificationDelivery);
NotificationDeliverySchema.index({ organizationId: 1, notificationId: 1, channel: 1 });
