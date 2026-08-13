import { PermissionType } from './permissions';
export declare const ROLES: {
    readonly OWNER: "OWNER";
    readonly MANAGER: "MANAGER";
    readonly STAFF: "STAFF";
    readonly TRAINER: "TRAINER";
    readonly MEMBER: "MEMBER";
    readonly SUPER_ADMIN: "SUPER_ADMIN";
};
export type RoleType = (typeof ROLES)[keyof typeof ROLES];
export declare const ROLE_PERMISSIONS: Record<RoleType, readonly PermissionType[]>;
