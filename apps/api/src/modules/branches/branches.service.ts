import { Injectable, NotFoundException, ConflictException, BadRequestException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateBranchDto, UpdateBranchDto } from '@klyro/validation';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { EntitlementService } from '../subscription/entitlement.service';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
    @Optional()
    private readonly entitlementService?: EntitlementService,
  ) {}

  async createBranch(organizationId: string, dto: CreateBranchDto): Promise<BranchDocument> {
    const orgObjectId = new Types.ObjectId(organizationId);

    // Verify branch limit and self check-in entitlement from plan
    if (this.entitlementService) {
      const plan = await this.entitlementService.getEffectivePlan(organizationId);
      if (plan) {
        const branchCount = await this.branchModel.countDocuments({ organizationId: orgObjectId });
        const maxBranches = plan.branchLimit || (plan.features?.multiBranch ? 5 : 1);
        if (branchCount >= maxBranches) {
          throw new BadRequestException(
            `Your ${plan.name} plan only supports single-branch management (limit: ${maxBranches}). Please upgrade to Growth or Pro to add more branches.`,
          );
        }
        if (dto.settings?.memberSelfCheckInEnabled && plan.features?.selfCheckIn === false) {
          throw new BadRequestException(
            `Member self check-in is not supported on the ${plan.name} plan. Please upgrade to Growth or Pro to enable GPS self check-in.`,
          );
        }
      }
    }

    const existingCode = await this.branchModel.findOne({
      organizationId: orgObjectId,
      code: dto.code.toUpperCase(),
    }).exec();

    if (existingCode) {
      throw new ConflictException(`Branch code '${dto.code}' already exists in this organization`);
    }

    if (dto.settings?.memberSelfCheckInEnabled) {
      const lat = dto.location?.latitude;
      const lng = dto.location?.longitude;
      if (lat === undefined || lat === null || lng === undefined || lng === null) {
        throw new BadRequestException('Set your gym location before enabling member self check-in.');
      }
    }

    return this.branchModel.create({
      organizationId: orgObjectId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      address: dto.address,
      location: dto.location || {},
      settings: dto.settings || { memberSelfCheckInEnabled: false, selfCheckInRadiusMeters: 100 },
    });
  }

  async findAllByOrganization(organizationId: string, page = 1, limit = 20) {
    const orgObjectId = new Types.ObjectId(organizationId);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.branchModel.find({ organizationId: orgObjectId }).skip(skip).limit(limit).exec(),
      this.branchModel.countDocuments({ organizationId: orgObjectId }).exec(),
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

  async findOneByIdAndOrg(id: string, organizationId: string): Promise<BranchDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid branch identifier format');
    }

    const branch = await this.branchModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    }).exec();

    if (!branch) {
      throw new NotFoundException('Branch not found in current organization');
    }

    return branch;
  }

  async updateBranch(id: string, organizationId: string, dto: UpdateBranchDto): Promise<BranchDocument> {
    const branch = await this.findOneByIdAndOrg(id, organizationId);

    if (dto.name) branch.name = dto.name;
    if (dto.code) {
      const codeUpper = dto.code.toUpperCase();
      if (codeUpper !== branch.code) {
        const existing = await this.branchModel.findOne({
          organizationId: new Types.ObjectId(organizationId),
          code: codeUpper,
        }).exec();
        if (existing) {
          throw new ConflictException(`Branch code '${dto.code}' already exists in this organization`);
        }
        branch.code = codeUpper;
      }
    }
    if (dto.status) branch.status = dto.status;
    if (dto.address) branch.address = dto.address;

    if (dto.location) {
      branch.location = {
        ...branch.location,
        ...dto.location,
      };
    }

    if (dto.settings) {
      branch.settings = {
        memberSelfCheckInEnabled: branch.settings?.memberSelfCheckInEnabled ?? false,
        selfCheckInRadiusMeters: branch.settings?.selfCheckInRadiusMeters ?? 100,
        ...dto.settings,
      };
    }

    const isEnablingSelfCheckIn = branch.settings?.memberSelfCheckInEnabled;
    if (isEnablingSelfCheckIn) {
      if (this.entitlementService) {
        const plan = await this.entitlementService.getEffectivePlan(organizationId);
        if (plan && plan.features?.selfCheckIn === false) {
          throw new BadRequestException(
            `Member self check-in is not supported on the ${plan.name} plan. Please upgrade to Growth or Pro to enable member self check-in.`,
          );
        }
      }

      const lat = branch.location?.latitude;
      const lng = branch.location?.longitude;
      if (lat === undefined || lat === null || lng === undefined || lng === null) {
        throw new BadRequestException('Set your gym location before enabling member self check-in.');
      }
    }

    return branch.save();
  }

  async deleteBranch(id: string, organizationId: string): Promise<{ success: boolean; message: string }> {
    const branch = await this.findOneByIdAndOrg(id, organizationId);
    const count = await this.branchModel.countDocuments({ organizationId: new Types.ObjectId(organizationId) }).exec();
    if (count <= 1) {
      throw new BadRequestException('Cannot delete the only branch of an organization. At least one branch is required.');
    }
    await this.branchModel.deleteOne({ _id: branch._id }).exec();
    return { success: true, message: `Branch '${branch.name}' has been deleted.` };
  }
}
