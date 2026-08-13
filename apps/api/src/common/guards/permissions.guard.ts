import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_PERMISSIONS, PermissionType } from '@klyro/config';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RequestWithTenant } from '../interfaces/request-with-tenant.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionType[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const tenantContext = request.tenantContext;

    if (!tenantContext || !tenantContext.role) {
      throw new ForbiddenException('Tenant authorization context missing');
    }

    const userPermissions = ROLE_PERMISSIONS[tenantContext.role] || [];

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('User lacks required permissions for this action');
    }

    return true;
  }
}
