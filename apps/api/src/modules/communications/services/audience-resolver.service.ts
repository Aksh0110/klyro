import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../../customers/schemas/customer.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { AUDIENCE_TYPES, AudienceType, CUSTOMER_STATUS } from '@klyro/config';

export interface EligibleRecipient {
  userId: Types.ObjectId;
  customerId?: Types.ObjectId;
}

@Injectable()
export class AudienceResolverService {
  private readonly logger = new Logger(AudienceResolverService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async resolveAudience(
    organizationId: string | Types.ObjectId,
    audienceType: AudienceType,
    branchId?: string | Types.ObjectId,
  ): Promise<EligibleRecipient[]> {
    const orgObjectId = new Types.ObjectId(organizationId);

    const query: any = { organizationId: orgObjectId };
    if (audienceType === AUDIENCE_TYPES.BRANCH_MEMBERS || audienceType === AUDIENCE_TYPES.BRANCH_INACTIVE_MEMBERS) {
      if (!branchId) {
        throw new Error(`branchId is required for ${audienceType} audience`);
      }
      query.branchId = new Types.ObjectId(branchId);
    }

    if (audienceType === AUDIENCE_TYPES.INACTIVE_MEMBERS || audienceType === AUDIENCE_TYPES.BRANCH_INACTIVE_MEMBERS) {
      query.status = CUSTOMER_STATUS.INACTIVE;
    } else {
      query.status = CUSTOMER_STATUS.ACTIVE;
    }

    // Find all customers matching organization & branch criteria
    const customers = await this.customerModel.find(query).lean();
    if (!customers || customers.length === 0) {
      return [];
    }

    const recipientsMap = new Map<string, EligibleRecipient>();

    // 1. Direct userId linkage
    const linkedCustomerUserIds = customers
      .filter((c: any) => c.userId)
      .map((c: any) => c.userId!.toString());

    // 2. Phone linkage
    const customerPhones = customers
      .filter((c) => c.phone)
      .map((c) => c.phone);

    // Fetch users with matching phone numbers if not already linked
    const usersByPhone = customerPhones.length > 0
      ? await this.userModel.find({ phone: { $in: customerPhones } }).lean()
      : [];

    const phoneToUserMap = new Map<string, Types.ObjectId>();
    usersByPhone.forEach((u) => {
      phoneToUserMap.set(u.phone, u._id as Types.ObjectId);
    });

    for (const c of customers) {
      let resolvedUserId: Types.ObjectId | undefined = undefined;
      const cAny = c as any;

      if (cAny.userId) {
        resolvedUserId = cAny.userId as Types.ObjectId;
      } else if (c.phone && phoneToUserMap.has(c.phone)) {
        resolvedUserId = phoneToUserMap.get(c.phone)!;
      }

      if (resolvedUserId) {
        const key = resolvedUserId.toString();
        if (!recipientsMap.has(key)) {
          recipientsMap.set(key, {
            userId: resolvedUserId,
            customerId: c._id as Types.ObjectId,
          });
        }
      }
    }

    const result = Array.from(recipientsMap.values());
    this.logger.log(`Resolved ${result.length} eligible recipients for audience ${audienceType}`);
    return result;
  }
}
