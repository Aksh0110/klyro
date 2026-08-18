import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, Min } from 'class-validator';

export enum ONBOARD_PAYMENT_MODE {
  PAY_NOW = 'PAY_NOW',
  PAY_LATER = 'PAY_LATER',
}

export class OnboardMemberDto {
  // Primary Customer details
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  // Secondary Customer details
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  // Membership details
  @IsString()
  @IsNotEmpty()
  membershipPlanId: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  customPrice?: number;

  // Payment decision
  @IsEnum(ONBOARD_PAYMENT_MODE)
  @IsOptional()
  paymentMode?: ONBOARD_PAYMENT_MODE = ONBOARD_PAYMENT_MODE.PAY_LATER;

  @IsNumber()
  @Min(0)
  @IsOptional()
  paymentAmount?: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  paymentReference?: string;
}
