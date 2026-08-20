import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCustomerDto, UpdateCustomerDto } from '@klyro/validation';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { BranchesService } from '../branches/branches.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    private readonly branchesService: BranchesService,
  ) {}

  async createCustomer(organizationId: string, dto: CreateCustomerDto): Promise<CustomerDocument> {
    const orgObjectId = new Types.ObjectId(organizationId);

    if (dto.dateOfBirth && new Date(dto.dateOfBirth) > new Date()) {
      throw new BadRequestException('Date of birth cannot be in the future');
    }

    // Verify branch belongs to organization
    await this.branchesService.findOneByIdAndOrg(dto.branchId, organizationId);

    // Generate tenant-scoped customer code (e.g. CUST-1001)
    const count = await this.customerModel.countDocuments({ organizationId: orgObjectId }).exec();
    const customerCode = `CUST-${1001 + count}`;

    try {
      return await this.customerModel.create({
        organizationId: orgObjectId,
        branchId: new Types.ObjectId(dto.branchId),
        customerCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        emergencyContact: dto.emergencyContact,
        address: dto.address,
        notes: dto.notes,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('A customer with this phone or code already exists in your organization');
      }
      throw err;
    }
  }

  async findAllByOrganization(
    organizationId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      branchId?: string;
      status?: string;
    },
  ) {
    const orgObjectId = new Types.ObjectId(organizationId);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { organizationId: orgObjectId };

    if (query.branchId && Types.ObjectId.isValid(query.branchId)) {
      filter.branchId = new Types.ObjectId(query.branchId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phone: searchRegex },
        { customerCode: searchRegex },
      ];
    }

    const [data, total] = await Promise.all([
      this.customerModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.customerModel.countDocuments(filter).exec(),
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

  async findOneByIdAndOrg(id: string, organizationId: string): Promise<CustomerDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid customer identifier format');
    }

    const customer = await this.customerModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    }).exec();

    if (!customer) {
      throw new NotFoundException('Customer not found in current organization');
    }

    return customer;
  }

  async updateCustomer(
    id: string,
    organizationId: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerDocument> {
    const customer = await this.findOneByIdAndOrg(id, organizationId);

    if (dto.firstName) customer.firstName = dto.firstName;
    if (dto.lastName !== undefined) customer.lastName = dto.lastName;
    if (dto.phone) customer.phone = dto.phone;
    if (dto.email !== undefined) customer.email = dto.email;
    if (dto.gender) customer.gender = dto.gender;
    if (dto.status) customer.status = dto.status;
    if (dto.emergencyContact) customer.emergencyContact = { ...customer.emergencyContact, ...dto.emergencyContact };
    if (dto.address) customer.address = { ...customer.address, ...dto.address };
    if (dto.notes !== undefined) customer.notes = dto.notes;

    return customer.save();
  }
}
