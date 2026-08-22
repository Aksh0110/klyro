import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true, collection: 'attendances' })
export class Attendance {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CustomerMembership' })
  membershipId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  attendanceDate!: string;

  @Prop({ required: true, default: Date.now })
  checkInAt!: Date;

  @Prop()
  checkOutAt?: Date;

  @Prop({ required: true, default: 'GPS_SELF_CHECKIN' })
  source!: string;

  @Prop({ type: Number })
  latitude?: number;

  @Prop({ type: Number })
  longitude?: number;

  @Prop({ type: Number })
  accuracyMeters?: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  recordedBy?: Types.ObjectId;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Compound index for idempotent same-day check-in per customer
AttendanceSchema.index({ organizationId: 1, customerId: 1, attendanceDate: 1 }, { unique: true });
