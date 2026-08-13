import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateMembershipPlanDto, UpdateMembershipPlanDto } from '@klyro/validation';
import { MembershipPlan, MembershipPlanDocument } from './schemas/membership-plan.schema';

@Injectable()
export class MembershipPlansService {
  constructor(
    @InjectModel(MembershipPlan.name)
    private readonly planModel: Model<MembershipPlanDocument>,
  ) {}

  async createPlan(organizationId: string, dto: CreateMembershipPlanDto): Promise<MembershipPlanDocument> {
    const orgObjectId = new Types.ObjectId(organizationId);
    const codeUpper = dto.code.toUpperCase();

    const existingCode = await this.planModel.findOne({
      organizationId: orgObjectId,
      code: codeUpper,
    }).exec();

    if (existingCode) {
      throw new ConflictException(`Membership plan code '${dto.code}' already exists in this organization`);
    }

    return this.planModel.create({
      organizationId: orgObjectId,
      name: dto.name,
      code: codeUpper,
      description: dto.description,
      duration: dto.duration,
      durationType: dto.durationType,
      price: dto.price,
    });
  }

  async findAllByOrganization(organizationId: string, page = 1, limit = 20) {
    const orgObjectId = new Types.ObjectId(organizationId);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.planModel.find({ organizationId: orgObjectId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.planModel.countDocuments({ organizationId: orgObjectId }).exec(),
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

  async findOneByIdAndOrg(id: string, organizationId: string): Promise<MembershipPlanDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid membership plan identifier format');
    }

    const plan = await this.planModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    }).exec();

    if (!plan) {
      throw new NotFoundException('Membership plan not found in current organization');
    }

    return plan;
  }

  async updatePlan(
    id: string,
    organizationId: string,
    dto: UpdateMembershipPlanDto,
  ): Promise<MembershipPlanDocument> {
    const plan = await this.findOneByIdAndOrg(id, organizationId);

    if (dto.name) plan.name = dto.name;
    if (dto.description !== undefined) plan.description = dto.description;
    if (dto.duration) plan.duration = dto.duration;
    if (dto.durationType) plan.durationType = dto.durationType;
    if (dto.price !== undefined) plan.price = dto.price;
    if (dto.status) plan.status = dto.status;

    return plan.save();
  }
}
