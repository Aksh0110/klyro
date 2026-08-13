import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PLAN_STATUS, PlanStatusType } from '@klyro/config';

export type SubscriptionPlanDocument = SubscriptionPlan & Document;

@Schema({ _id: false })
export class PlanFeatures {
  @Prop({ default: true })
  attendance!: boolean;

  @Prop({ default: true })
  reports!: boolean;

  @Prop({ default: true })
  staff!: boolean;

  @Prop({ default: true })
  renewalReminders!: boolean;
}

export const PlanFeaturesSchema = SchemaFactory.createForClass(PlanFeatures);

@Schema({ timestamps: true, collection: 'subscriptionPlans' })
export class SubscriptionPlan {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true, index: true })
  code!: string;

  @Prop()
  description?: string;

  @Prop({ required: true, min: 0 })
  monthlyPrice!: number;

  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({ required: true, default: 500 })
  memberLimit!: number;

  @Prop({ type: PlanFeaturesSchema, default: () => ({}) })
  features!: PlanFeatures;

  @Prop({ required: true, enum: Object.values(PLAN_STATUS), default: PLAN_STATUS.ACTIVE })
  status!: PlanStatusType;
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);
