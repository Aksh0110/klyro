import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BRANCH_STATUS, BranchStatusType } from '@klyro/config';
import { OrganizationAddress, OrganizationAddressSchema } from '../../organizations/schemas/organization.schema';

export type BranchDocument = Branch & Document;

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
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

// Compound index for organizationId and code uniqueness
BranchSchema.index({ organizationId: 1, code: 1 }, { unique: true });
