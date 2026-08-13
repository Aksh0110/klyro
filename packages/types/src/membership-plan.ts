import { PlanDurationType, PlanStatusType } from '@klyro/config';

export interface IMembershipPlan {
  _id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  duration: number;
  durationType: PlanDurationType;
  price: number;
  status: PlanStatusType;
  createdAt: Date | string;
  updatedAt: Date | string;
}
