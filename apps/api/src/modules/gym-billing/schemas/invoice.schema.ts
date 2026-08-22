import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { INVOICE_STATUS, InvoiceStatusType, INVOICE_SOURCE, InvoiceSourceType } from '@klyro/config';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true, collection: 'invoices' })
export class Invoice {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CustomerMembership', index: true })
  membershipId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  invoiceNumber!: string;

  @Prop({ required: true, min: 0 })
  subtotal!: number;

  @Prop({ required: true, default: 0, min: 0 })
  discountAmount!: number;

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  @Prop({ required: true, default: 0, min: 0 })
  paidAmount?: number;

  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({ required: true, enum: Object.values(INVOICE_STATUS), default: INVOICE_STATUS.OPEN })
  status!: InvoiceStatusType;

  @Prop({ required: true, enum: Object.values(INVOICE_SOURCE), default: INVOICE_SOURCE.MEMBERSHIP })
  source!: InvoiceSourceType;

  @Prop({ required: true, default: Date.now })
  issuedAt!: Date;

  @Prop({ required: true })
  dueAt!: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ organizationId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index(
  { organizationId: 1, membershipId: 1, source: 1 },
  { unique: true, partialFilterExpression: { membershipId: { $exists: true } } },
);
