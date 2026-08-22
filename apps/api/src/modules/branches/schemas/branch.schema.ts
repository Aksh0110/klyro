import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BRANCH_STATUS, BranchStatusType } from '@klyro/config';
import { OrganizationAddress, OrganizationAddressSchema } from '../../organizations/schemas/organization.schema';

export type BranchDocument = Branch & Document;

@Schema({ _id: false })
export class BranchLocation {
  @Prop({ type: Number })
  latitude?: number;

  @Prop({ type: Number })
  longitude?: number;
}
export const BranchLocationSchema = SchemaFactory.createForClass(BranchLocation);

@Schema({ _id: false })
export class BranchSettings {
  @Prop({ type: Boolean, default: false })
  memberSelfCheckInEnabled!: boolean;

  @Prop({ type: Number, default: 100 })
  selfCheckInRadiusMeters!: number;
}
export const BranchSettingsSchema = SchemaFactory.createForClass(BranchSettings);

@Schema({ timestamps: true, collection: 'branches' })
export class Branch {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  code!: string;

  @Prop({ required: true, enum: Object.values(BRANCH_STATUS), default: BRANCH_STATUS.ACTIVE })
  status!: BranchStatusType;

  @Prop({ type: OrganizationAddressSchema })
  address?: OrganizationAddress;

  @Prop({ type: BranchLocationSchema, default: {} })
  location?: BranchLocation;

  @Prop({ type: BranchSettingsSchema, default: { memberSelfCheckInEnabled: false, selfCheckInRadiusMeters: 100 } })
  settings?: BranchSettings;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

// Compound index for organizationId and code uniqueness
BranchSchema.index({ organizationId: 1, code: 1 }, { unique: true });
