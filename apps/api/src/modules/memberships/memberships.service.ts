import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { AssignMembershipDto, UpdateMembershipStatusDto } from '@klyro/validation';
import { PLAN_DURATION_TYPE, MEMBERSHIP_STATUS } from '@klyro/config';
import { CustomerMembership, CustomerMembershipDocument } from './schemas/customer-membership.schema';
import { CustomersService } from '../customers/customers.service';
import { MembershipPlansService } from '../membership-plans/membership-plans.service';
import { BranchesService } from '../branches/branches.service';
import { GymBillingService } from '../gym-billing/gym-billing.service';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectModel(CustomerMembership.name)
    private readonly membershipModel: Model<CustomerMembershipDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly customersService: CustomersService,
    private readonly plansService: MembershipPlansService,
    private readonly branchesService: BranchesService,
    private readonly gymBillingService: GymBillingService,
  ) {}

  async assignMembership(organizationId: string, dto: AssignMembershipDto): Promise<CustomerMembershipDocument> {
    const orgObjectId = new Types.ObjectId(organizationId);

    // Verify tenant ownership of customer, plan, and branch
    const customer = await this.customersService.findOneByIdAndOrg(dto.customerId, organizationId);
    const plan = await this.plansService.findOneByIdAndOrg(dto.membershipPlanId, organizationId);
    await this.branchesService.findOneByIdAndOrg(dto.branchId, organizationId);

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = new Date(startDate);

    // Calculate end date based on plan duration
    switch (plan.durationType) {
      case PLAN_DURATION_TYPE.DAYS:
        endDate.setDate(endDate.getDate() + plan.duration);
        break;
      case PLAN_DURATION_TYPE.WEEKS:
        endDate.setDate(endDate.getDate() + plan.duration * 7);
        break;
      case PLAN_DURATION_TYPE.MONTHS:
        endDate.setMonth(endDate.getMonth() + plan.duration);
        break;
      case PLAN_DURATION_TYPE.YEARS:
        endDate.setFullYear(endDate.getFullYear() + plan.duration);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + plan.duration);
    }

    const price = dto.customPrice !== undefined ? dto.customPrice : plan.price;

    const membership = await this.membershipModel.create({
      organizationId: orgObjectId,
      branchId: new Types.ObjectId(dto.branchId),
      customerId: customer._id,
      membershipPlanId: plan._id,
      startDate,
      endDate,
      status: MEMBERSHIP_STATUS.ACTIVE,
      price,
      notes: dto.notes,
    });

    try {
      await this.gymBillingService.createInvoiceForMembership(
        organizationId,
        dto.branchId,
        customer._id.toString(),
        membership._id.toString(),
        price,
        endDate,
      );
    } catch {
      // Ignore if invoice creation was already handled
    }

    return membership;
  }

  async findAllByOrganization(organizationId: string, page = 1, limit = 20, status?: string) {
    const orgObjectId = new Types.ObjectId(organizationId);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { organizationId: orgObjectId };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.membershipModel
        .find(filter)
        .populate('customerId', 'firstName lastName customerCode phone')
        .populate('membershipPlanId', 'name code duration durationType price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.membershipModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findAllByCustomer(customerId: string, organizationId: string) {
    // Verify customer exists in tenant
    await this.customersService.findOneByIdAndOrg(customerId, organizationId);

    return this.membershipModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        customerId: new Types.ObjectId(customerId),
      })
      .populate('membershipPlanId', 'name code duration durationType price')
      .sort({ startDate: -1 })
      .exec();
  }

  async updateMembershipStatus(
    id: string,
    organizationId: string,
    dto: UpdateMembershipStatusDto,
  ): Promise<CustomerMembershipDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid membership identifier format');
    }

    const membership = await this.membershipModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();

    if (!membership) {
      throw new NotFoundException('Customer membership subscription not found in current organization');
    }

    membership.status = dto.status;
    if (dto.notes) membership.notes = dto.notes;

    return membership.save();
  }

  async updateMembershipDetails(
    id: string,
    organizationId: string,
    dto: {
      membershipPlanId?: string;
      startDate?: string;
      endDate?: string;
      price?: number;
      status?: string;
      notes?: string;
    },
  ): Promise<CustomerMembershipDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid membership identifier format');
    }

    const membership = await this.membershipModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .exec();

    if (!membership) {
      throw new NotFoundException('Customer membership subscription not found in current organization');
    }

    if (dto.membershipPlanId && Types.ObjectId.isValid(dto.membershipPlanId)) {
      const plan = await this.plansService.findOneByIdAndOrg(dto.membershipPlanId, organizationId);
      membership.membershipPlanId = plan._id;
    }

    if (dto.startDate) membership.startDate = new Date(dto.startDate);
    if (dto.endDate) membership.endDate = new Date(dto.endDate);
    if (dto.price !== undefined) membership.price = dto.price;
    if (dto.status) membership.status = dto.status as any;
    if (dto.notes !== undefined) membership.notes = dto.notes;

    return membership.save();
  }
}
