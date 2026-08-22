import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { USER_STATUS, RoleType } from '@klyro/config';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createUser(phone: string, name?: string, email?: string): Promise<UserDocument> {
    return this.userModel.create({
      phone,
      name,
      email,
      status: USER_STATUS.ACTIVE,
      organizationIds: [],
      roles: [],
    });
  }

  async addOrganizationRole(
    userId: string,
    organizationId: string | Types.ObjectId,
    role: RoleType,
  ): Promise<UserDocument> {
    const orgObjectId = typeof organizationId === 'string' ? new Types.ObjectId(organizationId) : organizationId;
    const user = await this.findById(userId);

    // Add organization ID if not present
    if (!user.organizationIds.some((id) => id.toString() === orgObjectId.toString())) {
      user.organizationIds.push(orgObjectId);
    }

    // Update or append role for organization
    const roleIndex = user.roles.findIndex(
      (r) => r.organizationId.toString() === orgObjectId.toString(),
    );
    if (roleIndex > -1) {
      user.roles[roleIndex].role = role;
    } else {
      user.roles.push({ organizationId: orgObjectId, role });
    }

    return user.save();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { lastLoginAt: new Date() }).exec();
  }

  async updateUserProfile(userId: string, name?: string, email?: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (name !== undefined && name !== null && name.trim() !== '') {
      user.name = name.trim();
    }
    if (email !== undefined && email !== null && email.trim() !== '') {
      user.email = email.trim();
    }
    return user.save();
  }
}
