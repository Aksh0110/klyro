import {
  IsString,
  IsNotEmpty,
  Matches,
  IsEnum,
  IsOptional,
  ValidateNested,
  Length,
  IsEmail,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  VERTICALS,
  VerticalType,
  BRANCH_STATUS,
  BranchStatusType,
  CUSTOMER_STATUS,
  CustomerStatusType,
  GENDER,
  GenderType,
  PLAN_DURATION_TYPE,
  PlanDurationType,
  PLAN_STATUS,
  PlanStatusType,
  MEMBERSHIP_STATUS,
  MembershipStatusType,
  PAYMENT_METHOD,
  PaymentMethodType,
  MANDATE_METHOD,
  MandateMethodType,
} from '@klyro/config';

export const PHONE_REGEX = /^(\+?[0-9]{1,4}[-.\s]?)?[0-9]{10,14}$/;

export class SendOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(PHONE_REGEX, { message: 'Phone number must be a valid format' })
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(PHONE_REGEX, { message: 'Phone number must be a valid format' })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}

export class OrganizationContactDto {
  @IsOptional()
  @IsEmail({}, { message: 'Contact email must be valid' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class OrganizationAddressDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  name!: string;

  @IsEnum(VERTICALS, { message: 'Vertical must be one of: GYM, SALON, STUDIO, ACADEMY' })
  vertical!: VerticalType;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationContactDto)
  contact?: OrganizationContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationAddressDto)
  address?: OrganizationAddressDto;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(VERTICALS)
  vertical?: VerticalType;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationContactDto)
  contact?: OrganizationContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationAddressDto)
  address?: OrganizationAddressDto;
}

export class BranchLocationDto {
  @IsOptional()
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude?: number;
}

export class BranchSettingsDto {
  @IsOptional()
  @IsBoolean({ message: 'memberSelfCheckInEnabled must be a boolean' })
  memberSelfCheckInEnabled?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'selfCheckInRadiusMeters must be a number' })
  @Min(1, { message: 'selfCheckInRadiusMeters must be at least 1 meter' })
  selfCheckInRadiusMeters?: number;
}

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty({ message: 'Branch name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Branch code is required' })
  code!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationAddressDto)
  address?: OrganizationAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BranchLocationDto)
  location?: BranchLocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BranchSettingsDto)
  settings?: BranchSettingsDto;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(BRANCH_STATUS)
  status?: BranchStatusType;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationAddressDto)
  address?: OrganizationAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BranchLocationDto)
  location?: BranchLocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BranchSettingsDto)
  settings?: BranchSettingsDto;
}

export class EmergencyContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  relation?: string;
}

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Branch ID is required' })
  branchId!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(PHONE_REGEX, { message: 'Phone number must be valid format' })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be valid' })
  email?: string;

  @IsOptional()
  @IsEnum(GENDER)
  gender?: GenderType;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationAddressDto)
  address?: OrganizationAddressDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(GENDER)
  gender?: GenderType;

  @IsOptional()
  @IsEnum(CUSTOMER_STATUS)
  status?: CustomerStatusType;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationAddressDto)
  address?: OrganizationAddressDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMembershipPlanDto {
  @IsString()
  @IsNotEmpty({ message: 'Plan name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Plan code is required' })
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1, { message: 'Duration must be at least 1' })
  duration!: number;

  @IsEnum(PLAN_DURATION_TYPE)
  durationType!: PlanDurationType;

  @IsNumber()
  @Min(0, { message: 'Price cannot be negative' })
  price!: number;
}

export class UpdateMembershipPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsEnum(PLAN_DURATION_TYPE)
  durationType?: PlanDurationType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(PLAN_STATUS)
  status?: PlanStatusType;
}

export class AssignMembershipDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Membership Plan ID is required' })
  membershipPlanId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Branch ID is required' })
  branchId!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMembershipStatusDto {
  @IsEnum(MEMBERSHIP_STATUS)
  status!: MembershipStatusType;

  @IsOptional()
  @IsString()
  notes?: string;
}

// MILESTONE 3: DOMAIN A — KLYRO SUBSCRIPTION BILLING DTOs
export class CheckoutSubscriptionDto {
  @IsString()
  @IsNotEmpty({ message: 'Subscription Plan ID is required' })
  subscriptionPlanId!: string;
}

export class SetupAutopayDto {
  @IsEnum(MANDATE_METHOD)
  method!: MandateMethodType;
}

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId!: string;

  @IsOptional()
  @IsString()
  membershipId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsNumber()
  @Min(0, { message: 'Subtotal cannot be negative' })
  subtotal!: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Discount amount cannot be negative' })
  discountAmount?: number;

  @IsNumber()
  @Min(0, { message: 'Total amount cannot be negative' })
  totalAmount!: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Invoice ID is required' })
  invoiceId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  membershipId?: string;

  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be greater than 0' })
  amount!: number;

  @IsEnum(PAYMENT_METHOD)
  method!: PaymentMethodType;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RefundPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Refund amount must be greater than 0' })
  amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinancialSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

// MILESTONE 4: ATTENDANCE & GPS SELF CHECK-IN DTOs
export class SelfCheckInDto {
  @IsNumber({}, { message: 'Latitude is required and must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude!: number;

  @IsNumber({}, { message: 'Longitude is required and must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude!: number;

  @IsNumber({}, { message: 'Accuracy in meters is required and must be a number' })
  @Min(0, { message: 'Accuracy cannot be negative' })
  accuracyMeters!: number;
}

// MILESTONE 5: COMMUNICATIONS & NOTIFICATIONS DTOs
export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Body message is required' })
  body!: string;

  @IsString()
  @IsNotEmpty({ message: 'Audience type is required' })
  audienceType!: 'ALL_MEMBERS' | 'BRANCH_MEMBERS';

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  channels?: ('IN_APP' | 'WEB_PUSH' | 'WHATSAPP')[];
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  audienceType?: 'ALL_MEMBERS' | 'BRANCH_MEMBERS';

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  membershipReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  announcements?: boolean;
}

export class SavePushSubscriptionDto {
  @IsNotEmpty({ message: 'Push subscription is required' })
  subscription!: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

