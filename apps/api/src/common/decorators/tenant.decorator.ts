import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithTenant } from '../interfaces/request-with-tenant.interface';

export const GetTenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    return request.tenantContext;
  },
);

export const GetCurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    if (!request.user) return null;
    return data ? request.user[data as keyof typeof request.user] : request.user;
  },
);
