import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AUDIENCE_TYPES,
  AudienceType,
  ANNOUNCEMENT_STATUS,
  AnnouncementStatusType,
  DELIVERY_CHANNELS,
  DeliveryChannelType,
} from '@klyro/config';

export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true, collection: 'announcements' })
export class Announcement {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ required: true, enum: Object.values(AUDIENCE_TYPES), default: AUDIENCE_TYPES.ALL_MEMBERS })
  audienceType!: AudienceType;

  @Prop({ required: true, enum: Object.values(ANNOUNCEMENT_STATUS), default: ANNOUNCEMENT_STATUS.DRAFT, index: true })
  status!: AnnouncementStatusType;

  @Prop({ type: [String], default: [DELIVERY_CHANNELS.IN_APP, DELIVERY_CHANNELS.WEB_PUSH] })
  channels!: DeliveryChannelType[];

  @Prop({ type: Date, index: true })
  scheduledAt?: Date;

  @Prop({ type: Date })
  publishedAt?: Date;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
AnnouncementSchema.index({ organizationId: 1, status: 1, scheduledAt: 1 });
