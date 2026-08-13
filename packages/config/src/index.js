"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMBERSHIP_STATUS = exports.PLAN_STATUS = exports.PLAN_DURATION_TYPE = exports.GENDER = exports.CUSTOMER_STATUS = exports.DEFAULT_SETTINGS = exports.BRANCH_STATUS = exports.ORGANIZATION_STATUS = exports.USER_STATUS = exports.VERTICALS = void 0;
__exportStar(require("./permissions"), exports);
__exportStar(require("./roles"), exports);
exports.VERTICALS = {
    GYM: 'GYM',
    SALON: 'SALON',
    STUDIO: 'STUDIO',
    ACADEMY: 'ACADEMY',
};
exports.USER_STATUS = {
    ACTIVE: 'ACTIVE',
    INVITED: 'INVITED',
    SUSPENDED: 'SUSPENDED',
    DEACTIVATED: 'DEACTIVATED',
};
exports.ORGANIZATION_STATUS = {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
};
exports.BRANCH_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
};
exports.DEFAULT_SETTINGS = {
    TIMEZONE: 'Asia/Kolkata',
    CURRENCY: 'INR',
};
exports.CUSTOMER_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    BLOCKED: 'BLOCKED',
};
exports.GENDER = {
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    OTHER: 'OTHER',
    UNSPECIFIED: 'UNSPECIFIED',
};
exports.PLAN_DURATION_TYPE = {
    DAYS: 'DAYS',
    WEEKS: 'WEEKS',
    MONTHS: 'MONTHS',
    YEARS: 'YEARS',
};
exports.PLAN_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    ARCHIVED: 'ARCHIVED',
};
exports.MEMBERSHIP_STATUS = {
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
    PAUSED: 'PAUSED',
};
