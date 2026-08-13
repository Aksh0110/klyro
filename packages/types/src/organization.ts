import { OrganizationStatusType, VerticalType } from '@klyro/config';

export interface OrganizationContact {
  email?: string;
  phone?: string;
}

export interface OrganizationAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface OrganizationSettings {
  timezone: string;
  currency: string;
}

export interface IOrganization {
  _id: string;
  name: string;
  vertical: VerticalType;
  status: OrganizationStatusType;
  ownerUserId: string;
  contact?: OrganizationContact;
  address?: OrganizationAddress;
  settings: OrganizationSettings;
  createdAt: Date | string;
  updatedAt: Date | string;
}
