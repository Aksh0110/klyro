import { BranchStatusType } from '@klyro/config';
import { OrganizationAddress } from './organization';

export interface BranchLocation {
  latitude?: number;
  longitude?: number;
}

export interface BranchSettings {
  memberSelfCheckInEnabled: boolean;
  selfCheckInRadiusMeters: number;
}

export interface IBranch {
  _id: string;
  organizationId: string;
  name: string;
  code: string;
  status: BranchStatusType;
  address?: OrganizationAddress;
  location?: BranchLocation;
  settings?: BranchSettings;
  createdAt: Date | string;
  updatedAt: Date | string;
}
