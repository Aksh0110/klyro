import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MEMBERSHIP_STATUS, MembershipStatusType } from '@klyro/config';

export type CustomerMembershipDocument = CustomerMembership & Document;

@Schema({ timestamps: true, collection: 'customerMemberships' })
export class CustomerMembership {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MembershipPlan', required: true, index: true })
  membershipPlanId!: Types.ObjectId;

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true, index: true })
  endDate!: Date;

  @Prop({ required: true, enum: Object.values(MEMBERSHIP_STATUS), default: MEMBERSHIP_STATUS.ACTIVE })
  status!: MembershipStatusType;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop()
  notes?: string;
}

export const CustomerMembershipSchema = SchemaFactory.createForClass(CustomerMembership);
CustomerMembershipSchema.index({ organizationId: 1, customerId: 1, status: 1 });
