import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PAYMENT_METHOD, PaymentMethodType, PAYMENT_STATUS, PaymentStatusType } from '@klyro/config';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true, index: true })
  invoiceId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CustomerMembership', index: true })
  membershipId?: Types.ObjectId;

  @Prop({ required: true, min: 0.01 })
  amount!: number;

  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({ required: true, enum: Object.values(PAYMENT_METHOD) })
  method!: PaymentMethodType;

  @Prop({ required: true, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.SUCCESS })
  status!: PaymentStatusType;

  @Prop()
  reference?: string;

  @Prop()
  notes?: string;

  @Prop({ required: true, default: Date.now })
  paidAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy!: Types.ObjectId;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
