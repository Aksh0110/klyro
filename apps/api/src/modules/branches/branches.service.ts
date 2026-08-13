import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateBranchDto, UpdateBranchDto } from '@klyro/validation';
import { Branch, BranchDocument } from './schemas/branch.schema';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
  ) {}

  async createBranch(organizationId: string, dto: CreateBranchDto): Promise<BranchDocument> {
    const orgObjectId = new Types.ObjectId(organizationId);

    const existingCode = await this.branchModel.findOne({
      organizationId: orgObjectId,
      code: dto.code.toUpperCase(),
    }).exec();

    if (existingCode) {
      throw new ConflictException(`Branch code '${dto.code}' already exists in this organization`);
    }

    return this.branchModel.create({
      organizationId: orgObjectId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      address: dto.address,
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

    return branch.save();
  }
}
