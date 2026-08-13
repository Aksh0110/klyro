import { CustomerStatusType, GenderType } from '@klyro/config';
import { OrganizationAddress } from './organization';

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relation?: string;
}

export interface ICustomer {
  _id: string;
  organizationId: string;
  branchId: string;
  customerCode: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  gender: GenderType;
  dateOfBirth?: Date | string;
  emergencyContact?: EmergencyContact;
  address?: OrganizationAddress;
  status: CustomerStatusType;
  notes?: string;
  joinedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
