"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.ROLES = void 0;
const permissions_1 = require("./permissions");
exports.ROLES = {
    OWNER: 'OWNER',
    MANAGER: 'MANAGER',
    STAFF: 'STAFF',
    TRAINER: 'TRAINER',
    MEMBER: 'MEMBER',
    SUPER_ADMIN: 'SUPER_ADMIN',
};
exports.ROLE_PERMISSIONS = {
    [exports.ROLES.SUPER_ADMIN]: Object.values(permissions_1.PERMISSIONS),
    [exports.ROLES.OWNER]: Object.values(permissions_1.PERMISSIONS),
    [exports.ROLES.MANAGER]: [
        permissions_1.PERMISSIONS.ORGANIZATION_READ,
        permissions_1.PERMISSIONS.BRANCH_READ,
        permissions_1.PERMISSIONS.BRANCH_UPDATE,
        permissions_1.PERMISSIONS.CUSTOMER_READ,
        permissions_1.PERMISSIONS.CUSTOMER_CREATE,
        permissions_1.PERMISSIONS.CUSTOMER_UPDATE,
        permissions_1.PERMISSIONS.MEMBERSHIP_READ,
        permissions_1.PERMISSIONS.MEMBERSHIP_CREATE,
        permissions_1.PERMISSIONS.MEMBERSHIP_UPDATE,
        permissions_1.PERMISSIONS.PAYMENT_READ,
        permissions_1.PERMISSIONS.PAYMENT_CREATE,
        permissions_1.PERMISSIONS.ATTENDANCE_READ,
        permissions_1.PERMISSIONS.ATTENDANCE_CREATE,
        permissions_1.PERMISSIONS.STAFF_READ,
        permissions_1.PERMISSIONS.REPORTS_READ,
    ],
    [exports.ROLES.STAFF]: [
        permissions_1.PERMISSIONS.ORGANIZATION_READ,
        permissions_1.PERMISSIONS.BRANCH_READ,
        permissions_1.PERMISSIONS.CUSTOMER_READ,
        permissions_1.PERMISSIONS.CUSTOMER_CREATE,
        permissions_1.PERMISSIONS.MEMBERSHIP_READ,
        permissions_1.PERMISSIONS.PAYMENT_READ,
        permissions_1.PERMISSIONS.PAYMENT_CREATE,
        permissions_1.PERMISSIONS.ATTENDANCE_READ,
        permissions_1.PERMISSIONS.ATTENDANCE_CREATE,
    ],
    [exports.ROLES.TRAINER]: [
        permissions_1.PERMISSIONS.ORGANIZATION_READ,
        permissions_1.PERMISSIONS.BRANCH_READ,
        permissions_1.PERMISSIONS.CUSTOMER_READ,
        permissions_1.PERMISSIONS.ATTENDANCE_READ,
        permissions_1.PERMISSIONS.ATTENDANCE_CREATE,
    ],
    [exports.ROLES.MEMBER]: [
        permissions_1.PERMISSIONS.ORGANIZATION_READ,
        permissions_1.PERMISSIONS.BRANCH_READ,
        permissions_1.PERMISSIONS.MEMBERSHIP_READ,
        permissions_1.PERMISSIONS.ATTENDANCE_READ,
    ],
};
