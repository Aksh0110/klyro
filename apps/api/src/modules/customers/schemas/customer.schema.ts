import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CUSTOMER_STATUS, CustomerStatusType, GENDER, GenderType } from '@klyro/config';
import { OrganizationAddress, OrganizationAddressSchema } from '../../organizations/schemas/organization.schema';

export type CustomerDocument = Customer & Document;

@Schema({ _id: false })
export class EmergencyContact {
  @Prop()
  name?: string;

  @Prop()
  phone?: string;

  @Prop()
  relation?: string;
}

export const EmergencyContactSchema = SchemaFactory.createForClass(EmergencyContact);

@Schema({ timestamps: true, collection: 'customers' })
export class Customer {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId!: Types.ObjectId;

  @Prop({ required: true })
  customerCode!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true, index: true })
  phone!: string;

  @Prop()
  email?: string;

  @Prop({ required: true, enum: Object.values(GENDER), default: GENDER.UNSPECIFIED })
  gender!: GenderType;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ type: EmergencyContactSchema })
  emergencyContact?: EmergencyContact;

  @Prop({ type: OrganizationAddressSchema })
  address?: OrganizationAddress;

  @Prop({ required: true, enum: Object.values(CUSTOMER_STATUS), default: CUSTOMER_STATUS.ACTIVE })
  status!: CustomerStatusType;

  @Prop()
  notes?: string;

  @Prop({ default: Date.now })
  joinedAt!: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Compound index for tenant uniqueness of customerCode and phone
CustomerSchema.index({ organizationId: 1, customerCode: 1 }, { unique: true });
CustomerSchema.index({ organizationId: 1, phone: 1 });
