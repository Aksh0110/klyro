import { BranchStatusType } from '@klyro/config';
import { OrganizationAddress } from './organization';

export interface IBranch {
  _id: string;
  organizationId: string;
  name: string;
  code: string;
  status: BranchStatusType;
  address?: OrganizationAddress;
  createdAt: Date | string;
  updatedAt: Date | string;
}
