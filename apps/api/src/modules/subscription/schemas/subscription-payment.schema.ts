import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SUBSCRIPTION_PAYMENT_STATUS, SubscriptionPaymentStatusType } from '@klyro/config';

export type SubscriptionPaymentDocument = SubscriptionPayment & Document;

@Schema({ timestamps: true, collection: 'subscriptionPayments' })
export class SubscriptionPayment {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription', required: true, index: true })
  subscriptionId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({ required: true, enum: Object.values(SUBSCRIPTION_PAYMENT_STATUS), default: SUBSCRIPTION_PAYMENT_STATUS.PENDING })
  status!: SubscriptionPaymentStatusType;

  @Prop({ required: true, default: 'RAZORPAY' })
  method!: string;

  @Prop({ required: true, default: 'RAZORPAY' })
  provider!: string;

  @Prop()
  providerPaymentId?: string;

  @Prop()
  providerOrderId?: string;

  @Prop()
  paidAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const SubscriptionPaymentSchema = SchemaFactory.createForClass(SubscriptionPayment);
