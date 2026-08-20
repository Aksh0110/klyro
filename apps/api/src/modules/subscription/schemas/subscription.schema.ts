import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SUBSCRIPTION_STATUS, SubscriptionStatusType } from '@klyro/config';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SubscriptionPlan', required: true, index: true })
  subscriptionPlanId!: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(SUBSCRIPTION_STATUS), default: SUBSCRIPTION_STATUS.PENDING_PAYMENT })
  status!: SubscriptionStatusType;

  @Prop({ default: Date.now })
  startedAt!: Date;

  @Prop({ required: true })
  currentPeriodStart!: Date;

  @Prop({ required: true })
  currentPeriodEnd!: Date;

  @Prop({ default: false })
  cancelAtPeriodEnd!: boolean;

  @Prop({ required: true, default: 'RAZORPAY' })
  provider!: string;

  @Prop()
  providerSubscriptionId?: string;

  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop()
  trialEndsAt?: Date;

  @Prop()
  gracePeriodEndsAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
