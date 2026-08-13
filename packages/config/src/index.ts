export * from './permissions';
export * from './roles';

export const VERTICALS = {
  GYM: 'GYM',
  SALON: 'SALON',
  STUDIO: 'STUDIO',
  ACADEMY: 'ACADEMY',
} as const;

export type VerticalType = (typeof VERTICALS)[keyof typeof VERTICALS];

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INVITED: 'INVITED',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

export type UserStatusType = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const ORGANIZATION_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type OrganizationStatusType = (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS];

export const BRANCH_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type BranchStatusType = (typeof BRANCH_STATUS)[keyof typeof BRANCH_STATUS];

export const DEFAULT_SETTINGS = {
  TIMEZONE: 'Asia/Kolkata',
  CURRENCY: 'INR',
} as const;

export const CUSTOMER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
} as const;

export type CustomerStatusType = (typeof CUSTOMER_STATUS)[keyof typeof CUSTOMER_STATUS];

export const GENDER = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
  UNSPECIFIED: 'UNSPECIFIED',
} as const;

export type GenderType = (typeof GENDER)[keyof typeof GENDER];

export const PLAN_DURATION_TYPE = {
  DAYS: 'DAYS',
  WEEKS: 'WEEKS',
  MONTHS: 'MONTHS',
  YEARS: 'YEARS',
} as const;

export type PlanDurationType = (typeof PLAN_DURATION_TYPE)[keyof typeof PLAN_DURATION_TYPE];

export const PLAN_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type PlanStatusType = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];

export const MEMBERSHIP_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  PAUSED: 'PAUSED',
} as const;

export type MembershipStatusType = (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];

// DOMAIN A — KLYRO SUBSCRIPTION BILLING CONSTANTS
export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PENDING_AUTOPAY: 'PENDING_AUTOPAY',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type SubscriptionStatusType = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const SUBSCRIPTION_PAYMENT_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type SubscriptionPaymentStatusType =
  (typeof SUBSCRIPTION_PAYMENT_STATUS)[keyof typeof SUBSCRIPTION_PAYMENT_STATUS];

export const MANDATE_METHOD = {
  UPI_AUTOPAY: 'UPI_AUTOPAY',
  CARD: 'CARD',
  EMANDATE: 'EMANDATE',
} as const;

export type MandateMethodType = (typeof MANDATE_METHOD)[keyof typeof MANDATE_METHOD];

export const MANDATE_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type MandateStatusType = (typeof MANDATE_STATUS)[keyof typeof MANDATE_STATUS];

export const DEFAULT_GRACE_PERIOD_DAYS = 7;

// DOMAIN B — GYM MEMBER BILLING CONSTANTS
export const INVOICE_STATUS = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  VOID: 'VOID',
} as const;

export type InvoiceStatusType = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const INVOICE_SOURCE = {
  MEMBERSHIP: 'MEMBERSHIP',
  OTHER: 'OTHER',
} as const;

export type InvoiceSourceType = (typeof INVOICE_SOURCE)[keyof typeof INVOICE_SOURCE];

export const PAYMENT_METHOD = {
  CASH: 'CASH',
  UPI: 'UPI',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  OTHER: 'OTHER',
} as const;

export type PaymentMethodType = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_STATUS = {
  SUCCESS: 'SUCCESS',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatusType = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
