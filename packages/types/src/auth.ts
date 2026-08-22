import { RoleType } from '@klyro/config';
import { IUser } from './user';
import { IOrganization } from './organization';

export interface SendOtpPayload {
  phone: string;
}

export interface VerifyOtpPayload {
  phone: string;
  otp: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  user: IUser;
  tokens: AuthTokens;
  isNewUser: boolean;
  hasOrganization: boolean;
  devOtp?: string; // Only included in non-production environment for test ease if enabled
}

export interface SendOtpResponseData {
  message: string;
  expiresInSeconds: number;
  devOtp?: string;
}

export interface TenantContext {
  organizationId: string;
  branchId?: string;
  role: RoleType;
  userId: string;
}

export interface JwtPayload {
  sub: string; // userId
  phone: string;
  activeOrganizationId?: string;
}
