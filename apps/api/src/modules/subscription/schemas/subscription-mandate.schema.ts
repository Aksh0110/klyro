import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MANDATE_METHOD, MandateMethodType, MANDATE_STATUS, MandateStatusType } from '@klyro/config';

export type SubscriptionMandateDocument = SubscriptionMandate & Document;

@Schema({ timestamps: true, collection: 'subscriptionMandates' })
export class SubscriptionMandate {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true, index: true })
  subscriptionId!: Types.ObjectId;

  @Prop({ required: true, default: 'RAZORPAY' })
  provider!: string;

  @Prop()
  providerMandateId?: string;

  @Prop({ required: true, enum: Object.values(MANDATE_METHOD), default: MANDATE_METHOD.UPI_AUTOPAY })
  method!: MandateMethodType;

  @Prop({ required: true, enum: Object.values(MANDATE_STATUS), default: MANDATE_STATUS.PENDING })
  status!: MandateStatusType;

  @Prop()
  activatedAt?: Date;

  @Prop()
  expiresAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const SubscriptionMandateSchema = SchemaFactory.createForClass(SubscriptionMandate);
