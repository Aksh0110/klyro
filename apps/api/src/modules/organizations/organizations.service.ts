import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateOrganizationDto, UpdateOrganizationDto } from '@klyro/validation';
import { ROLES, DEFAULT_SETTINGS } from '@klyro/config';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { UsersService } from '../users/users.service';
import { BranchesService } from '../branches/branches.service';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
    private readonly usersService: UsersService,
    private readonly branchesService: BranchesService,
  ) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const userObjectId = new Types.ObjectId(userId);

    const organization = await this.organizationModel.create({
      name: dto.name,
      vertical: dto.vertical,
      ownerUserId: userObjectId,
      contact: dto.contact,
      address: dto.address,
      settings: {
        timezone: DEFAULT_SETTINGS.TIMEZONE,
        currency: DEFAULT_SETTINGS.CURRENCY,
      },
    });

    const orgId = organization._id.toString();

    // Update owner user name and email if provided
    if (dto.ownerName || dto.ownerEmail) {
      await this.usersService.updateUserProfile(userId, dto.ownerName, dto.ownerEmail);
    }

    // Associate user as OWNER
    await this.usersService.addOrganizationRole(userId, orgId, ROLES.OWNER);

    // Automatically create Main Branch
    const mainBranch = await this.branchesService.createBranch(orgId, {
      name: 'Main Branch',
      code: 'MAIN',
      address: dto.address,
    });

    return {
      organization,
      mainBranch,
    };
  }

  async getOrganizationById(organizationId: string): Promise<OrganizationDocument> {
    if (!Types.ObjectId.isValid(organizationId)) {
      throw new NotFoundException('Invalid organization identifier format');
    }

    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async updateOrganization(
    organizationId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationDocument> {
    const org = await this.getOrganizationById(organizationId);

    if (dto.name) org.name = dto.name;
    if (dto.vertical) org.vertical = dto.vertical;
    if (dto.contact) org.contact = { ...org.contact, ...dto.contact };
    if (dto.address) org.address = { ...org.address, ...dto.address };

    return org.save();
  }
}
