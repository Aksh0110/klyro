import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, Min } from 'class-validator';
import { ONBOARD_PAYMENT_MODE } from './onboard-member.dto';

export class RenewMemberDto {
  @IsString()
  @IsOptional()
  membershipPlanId?: string;

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
