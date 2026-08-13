import { RoleType, UserStatusType } from '@klyro/config';

export interface UserRoleAssignment {
  organizationId: string;
  role: RoleType;
}

export interface IUser {
  _id: string;
  phone: string;
  name?: string;
  email?: string;
  status: UserStatusType;
  organizationIds: string[];
  roles: UserRoleAssignment[];
  lastLoginAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
