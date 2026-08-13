import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { EntitlementService } from '../entitlement.service';
import { RequestWithTenant } from '../../../common/interfaces/request-with-tenant.interface';

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(private readonly entitlementService: EntitlementService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const tenantContext = request.tenantContext;

    if (!tenantContext || !tenantContext.organizationId) {
      return true; // TenantGuard handles tenant context missing error
    }

    const check = await this.entitlementService.checkEntitlement(tenantContext.organizationId);

    if (!check.hasAccess) {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_ENTITLEMENT_REQUIRED',
        message: check.reason || 'Klyro subscription is inactive or requires payment',
        details: { status: check.status },
      });
    }

    return true;
  }
}
