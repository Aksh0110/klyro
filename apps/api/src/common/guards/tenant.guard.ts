import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ROLES } from '@klyro/config';
import { User, UserDocument } from '../../modules/users/schemas/user.schema';
import { Customer, CustomerDocument } from '../../modules/customers/schemas/customer.schema';
import { RequestWithTenant } from '../interfaces/request-with-tenant.interface';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const userPayload = request.user;

    if (!userPayload || !userPayload.userId) {
      throw new UnauthorizedException('Authentication required for tenant operations');
    }

    const headerOrgId = request.headers['x-organization-id'] as string | undefined;
    const targetOrgId = headerOrgId || userPayload.activeOrganizationId;

    if (!targetOrgId) {
      throw new ForbiddenException('No active organization context specified');
    }

    if (!Types.ObjectId.isValid(targetOrgId)) {
      throw new ForbiddenException('Invalid organization identifier format');
    }

    const dbUser = await this.userModel.findById(userPayload.userId).exec();
    if (!dbUser) {
      throw new UnauthorizedException('Authenticated user record not found');
    }

    const roleAssignment = dbUser.roles.find(
      (r) => r.organizationId.toString() === targetOrgId,
    );

    let effectiveRole = roleAssignment?.role;

    if (!effectiveRole) {
      const isMemberCustomer = await this.customerModel.exists({
        organizationId: new Types.ObjectId(targetOrgId),
        $or: [{ userId: dbUser._id }, { phone: dbUser.phone }],
      });

      if (isMemberCustomer) {
        effectiveRole = ROLES.MEMBER;
      } else {
        throw new ForbiddenException('User is not authorized for the requested organization context');
      }
    }

    const headerBranchId = request.headers['x-branch-id'] as string | undefined;

    request.tenantContext = {
      organizationId: targetOrgId,
      branchId: headerBranchId,
      role: effectiveRole,
      userId: dbUser._id.toString(),
    };

    return true;
  }
}
