import { MembershipStatusType } from '@klyro/config';
import { ICustomer } from './customer';
import { IMembershipPlan } from './membership-plan';

export interface ICustomerMembership {
  _id: string;
  organizationId: string;
  branchId: string;
  customerId: string | ICustomer;
  membershipPlanId: string | IMembershipPlan;
  startDate: Date | string;
  endDate: Date | string;
  status: MembershipStatusType;
  price: number;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
