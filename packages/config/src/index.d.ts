export * from './permissions';
export * from './roles';
export declare const VERTICALS: {
    readonly GYM: "GYM";
    readonly SALON: "SALON";
    readonly STUDIO: "STUDIO";
    readonly ACADEMY: "ACADEMY";
};
export type VerticalType = (typeof VERTICALS)[keyof typeof VERTICALS];
export declare const USER_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly INVITED: "INVITED";
    readonly SUSPENDED: "SUSPENDED";
    readonly DEACTIVATED: "DEACTIVATED";
};
export type UserStatusType = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export declare const ORGANIZATION_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly SUSPENDED: "SUSPENDED";
};
export type OrganizationStatusType = (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS];
export declare const BRANCH_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
};
export type BranchStatusType = (typeof BRANCH_STATUS)[keyof typeof BRANCH_STATUS];
export declare const DEFAULT_SETTINGS: {
    readonly TIMEZONE: "Asia/Kolkata";
    readonly CURRENCY: "INR";
};
export declare const CUSTOMER_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
    readonly BLOCKED: "BLOCKED";
};
export type CustomerStatusType = (typeof CUSTOMER_STATUS)[keyof typeof CUSTOMER_STATUS];
export declare const GENDER: {
    readonly MALE: "MALE";
    readonly FEMALE: "FEMALE";
    readonly OTHER: "OTHER";
    readonly UNSPECIFIED: "UNSPECIFIED";
};
export type GenderType = (typeof GENDER)[keyof typeof GENDER];
export declare const PLAN_DURATION_TYPE: {
    readonly DAYS: "DAYS";
    readonly WEEKS: "WEEKS";
    readonly MONTHS: "MONTHS";
    readonly YEARS: "YEARS";
};
export type PlanDurationType = (typeof PLAN_DURATION_TYPE)[keyof typeof PLAN_DURATION_TYPE];
export declare const PLAN_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
    readonly ARCHIVED: "ARCHIVED";
};
export type PlanStatusType = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];
export declare const MEMBERSHIP_STATUS: {
    readonly PENDING: "PENDING";
    readonly ACTIVE: "ACTIVE";
    readonly EXPIRED: "EXPIRED";
    readonly CANCELLED: "CANCELLED";
    readonly PAUSED: "PAUSED";
};
export type MembershipStatusType = (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];
