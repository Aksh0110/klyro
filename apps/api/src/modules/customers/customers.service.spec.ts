import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CustomersService } from './customers.service';
import { Customer } from './schemas/customer.schema';
import { BranchesService } from '../branches/branches.service';
import { Types } from 'mongoose';
import { CUSTOMER_STATUS } from '@klyro/config';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockCustomerModel: any;
  let mockBranchesService: any;

  beforeEach(async () => {
    mockCustomerModel = {
      countDocuments: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    mockBranchesService = {
      findOneByIdAndOrg: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel,
        },
        {
          provide: BranchesService,
          useValue: mockBranchesService,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should create customer with generated customer code CUST-1001', async () => {
    const orgId = new Types.ObjectId().toString();
    const branchId = new Types.ObjectId().toString();

    mockBranchesService.findOneByIdAndOrg.mockResolvedValue({});
    mockCustomerModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    const mockCreatedCustomer = {
      _id: new Types.ObjectId(),
      customerCode: 'CUST-1001',
      firstName: 'Rahul',
      phone: '+919876543210',
      status: CUSTOMER_STATUS.ACTIVE,
    };
    mockCustomerModel.create.mockResolvedValue(mockCreatedCustomer);

    const result = await service.createCustomer(orgId, {
      branchId,
      firstName: 'Rahul',
      phone: '+919876543210',
    });

    expect(result.customerCode).toBe('CUST-1001');
    expect(mockBranchesService.findOneByIdAndOrg).toHaveBeenCalledWith(branchId, orgId);
  });
});
