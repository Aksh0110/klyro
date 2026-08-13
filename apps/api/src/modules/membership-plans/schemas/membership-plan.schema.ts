import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  PLAN_DURATION_TYPE,
  PlanDurationType,
  PLAN_STATUS,
  PlanStatusType,
} from '@klyro/config';

export type MembershipPlanDocument = MembershipPlan & Document;

@Schema({ timestamps: true, collection: 'membershipPlans' })
export class MembershipPlan {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  code!: string;

  @Prop()
  description?: string;

  @Prop({ required: true, min: 1 })
  duration!: number;

  @Prop({ required: true, enum: Object.values(PLAN_DURATION_TYPE) })
  durationType!: PlanDurationType;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, enum: Object.values(PLAN_STATUS), default: PLAN_STATUS.ACTIVE })
  status!: PlanStatusType;
}

export const MembershipPlanSchema = SchemaFactory.createForClass(MembershipPlan);
MembershipPlanSchema.index({ organizationId: 1, code: 1 }, { unique: true });
