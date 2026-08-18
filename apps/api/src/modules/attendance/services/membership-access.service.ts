import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MEMBERSHIP_STATUS } from '@klyro/config';
import { CustomerMembership, CustomerMembershipDocument } from '../../memberships/schemas/customer-membership.schema';

export interface MembershipAccessDecision {
  allowed: boolean;
  reason: 'ACTIVE_MEMBERSHIP' | 'MEMBERSHIP_EXPIRED' | 'NO_ACTIVE_MEMBERSHIP';
  membership?: CustomerMembershipDocument;
}

@Injectable()
export class MembershipAccessService {
  constructor(
    @InjectModel(CustomerMembership.name)
    private readonly membershipModel: Model<CustomerMembershipDocument>,
  ) {}

  async evaluateAccess(organizationId: string, customerId: string): Promise<MembershipAccessDecision> {
    const orgObjectId = new Types.ObjectId(organizationId);
    const custObjectId = new Types.ObjectId(customerId);
    const now = new Date();

    const memberships = await this.membershipModel
      .find({
        organizationId: orgObjectId,
        customerId: custObjectId,
      })
      .sort({ endDate: -1 })
      .exec();

    if (!memberships || memberships.length === 0) {
      return {
        allowed: false,
        reason: 'NO_ACTIVE_MEMBERSHIP',
      };
    }

    const activeMembership = memberships.find((m) => {
      return (
        m.status === MEMBERSHIP_STATUS.ACTIVE &&
        m.startDate <= now &&
        m.endDate >= now
      );
    });

    if (activeMembership) {
      return {
        allowed: true,
        reason: 'ACTIVE_MEMBERSHIP',
        membership: activeMembership,
      };
    }

    const latest = memberships[0];
    if (latest.status === MEMBERSHIP_STATUS.EXPIRED || latest.endDate < now) {
      return {
        allowed: false,
        reason: 'MEMBERSHIP_EXPIRED',
        membership: latest,
      };
    }

    return {
      allowed: false,
      reason: 'NO_ACTIVE_MEMBERSHIP',
      membership: latest,
    };
  }
}
