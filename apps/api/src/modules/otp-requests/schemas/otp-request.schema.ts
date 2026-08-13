import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpRequestDocument = OtpRequest & Document;

@Schema({ timestamps: true, collection: 'otpRequests' })
export class OtpRequest {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ required: true, index: true })
  phone!: string;

  @Prop({ required: true })
  otpHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ default: false })
  verified!: boolean;
}

export const OtpRequestSchema = SchemaFactory.createForClass(OtpRequest);
// TTL index to automatically purge expired OTP requests after 24 hours
OtpRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
