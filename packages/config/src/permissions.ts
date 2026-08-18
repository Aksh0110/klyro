export const PERMISSIONS = {
  ORGANIZATION_READ: 'organization:read',
  ORGANIZATION_UPDATE: 'organization:update',

  BRANCH_READ: 'branch:read',
  BRANCH_CREATE: 'branch:create',
  BRANCH_UPDATE: 'branch:update',

  CUSTOMER_READ: 'customer:read',
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_UPDATE: 'customer:update',

  MEMBERSHIP_READ: 'membership:read',
  MEMBERSHIP_CREATE: 'membership:create',
  MEMBERSHIP_UPDATE: 'membership:update',

  // Domain A — Klyro SaaS Subscription Billing
  SUBSCRIPTION_READ: 'subscription:read',
  SUBSCRIPTION_MANAGE: 'subscription:manage',

  // Domain B — Gym Member Billing
  INVOICE_READ: 'invoice:read',
  INVOICE_CREATE: 'invoice:create',
  INVOICE_UPDATE: 'invoice:update',

  PAYMENT_READ: 'payment:read',
  PAYMENT_CREATE: 'payment:create',
  PAYMENT_REFUND: 'payment:refund',

  FINANCIAL_SUMMARY_READ: 'financial_summary:read',

  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_READ_OWN: 'attendance:read:own',
  ATTENDANCE_CREATE: 'attendance:create',
  ATTENDANCE_SELF_CHECKIN: 'attendance:self_checkin',
  ATTENDANCE_SUMMARY: 'attendance:summary',

  STAFF_READ: 'staff:read',
  STAFF_MANAGE: 'staff:manage',

  // Milestone 5 — Communications & Notifications
  ANNOUNCEMENT_READ: 'announcement:read',
  ANNOUNCEMENT_CREATE: 'announcement:create',
  ANNOUNCEMENT_UPDATE: 'announcement:update',
  ANNOUNCEMENT_PUBLISH: 'announcement:publish',
  ANNOUNCEMENT_CANCEL: 'announcement:cancel',

  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_MANAGE: 'notification:manage',
  NOTIFICATION_RUN_TRIGGERS: 'notification:run_triggers',

  REPORTS_READ: 'reports:read',
  BILLING_MANAGE: 'billing:manage',
} as const;

export type PermissionType = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
