import { Request } from 'express';
import { TenantContext } from '@klyro/types';

export interface RequestWithTenant extends Request {
  user?: {
    userId: string;
    phone: string;
    activeOrganizationId?: string;
  };
  tenantContext?: TenantContext;
}
