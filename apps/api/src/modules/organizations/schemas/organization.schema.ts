import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  VERTICALS,
  VerticalType,
  ORGANIZATION_STATUS,
  OrganizationStatusType,
  DEFAULT_SETTINGS,
} from '@klyro/config';

export type OrganizationDocument = Organization & Document;

@Schema({ _id: false })
export class OrganizationContact {
  @Prop()
  email?: string;

  @Prop()
  phone?: string;
}

export const OrganizationContactSchema = SchemaFactory.createForClass(OrganizationContact);

@Schema({ _id: false })
export class OrganizationAddress {
  @Prop()
  street?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  country?: string;
}

export const OrganizationAddressSchema = SchemaFactory.createForClass(OrganizationAddress);

@Schema({ _id: false })
export class OrganizationSettings {
  @Prop({ default: DEFAULT_SETTINGS.TIMEZONE })
  timezone!: string;

  @Prop({ default: DEFAULT_SETTINGS.CURRENCY })
  currency!: string;
}

export const OrganizationSettingsSchema = SchemaFactory.createForClass(OrganizationSettings);

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ required: true, index: true })
  name!: string;

  @Prop({ required: true, enum: Object.values(VERTICALS) })
  vertical!: VerticalType;

  @Prop({ required: true, enum: Object.values(ORGANIZATION_STATUS), default: ORGANIZATION_STATUS.ACTIVE })
  status!: OrganizationStatusType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerUserId!: Types.ObjectId;

  @Prop({ type: OrganizationContactSchema })
  contact?: OrganizationContact;

  @Prop({ type: OrganizationAddressSchema })
  address?: OrganizationAddress;

  @Prop({ type: OrganizationSettingsSchema, default: () => ({}) })
  settings!: OrganizationSettings;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
