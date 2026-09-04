import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { MembershipsService } from './memberships.service';
import { CustomerMembership } from './schemas/customer-membership.schema';
import { CustomersService } from '../customers/customers.service';
import { MembershipPlansService } from '../membership-plans/membership-plans.service';
import { BranchesService } from '../branches/branches.service';
import { GymBillingService } from '../gym-billing/gym-billing.service';
import { Types } from 'mongoose';
import { PLAN_DURATION_TYPE, MEMBERSHIP_STATUS } from '@klyro/config';

describe('MembershipsService', () => {
  let service: MembershipsService;
  let mockMembershipModel: any;
  let mockCustomersService: any;
  let mockPlansService: any;
  let mockBranchesService: any;

  beforeEach(async () => {
    mockMembershipModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
    };
    mockCustomersService = {
      findOneByIdAndOrg: jest.fn(),
    };
    mockPlansService = {
      findOneByIdAndOrg: jest.fn(),
    };
    mockBranchesService = {
      findOneByIdAndOrg: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        {
          provide: getModelToken(CustomerMembership.name),
          useValue: mockMembershipModel,
        },
        {
          provide: getConnectionToken(),
          useValue: {
            startSession: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
        {
          provide: MembershipPlansService,
          useValue: mockPlansService,
        },
        {
          provide: BranchesService,
          useValue: mockBranchesService,
        },
        {
          provide: GymBillingService,
          useValue: {
            createInvoiceForMembership: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<MembershipsService>(MembershipsService);
  });

  it('should assign membership and calculate end date correctly for 1 month plan', async () => {
    const orgId = new Types.ObjectId().toString();
    const custId = new Types.ObjectId().toString();
    const planId = new Types.ObjectId().toString();
    const branchId = new Types.ObjectId().toString();

    mockCustomersService.findOneByIdAndOrg.mockResolvedValue({ _id: custId });
    mockPlansService.findOneByIdAndOrg.mockResolvedValue({
      _id: planId,
      duration: 1,
      durationType: PLAN_DURATION_TYPE.MONTHS,
      price: 2500,
    });
    mockBranchesService.findOneByIdAndOrg.mockResolvedValue({});

    mockMembershipModel.create.mockImplementation((dto: any) =>
      Promise.resolve({ _id: new Types.ObjectId(), ...dto }),
    );

    const startDateStr = '2026-08-01T00:00:00.000Z';
    const result = await service.assignMembership(orgId, {
      customerId: custId,
      membershipPlanId: planId,
      branchId,
      startDate: startDateStr,
    });

    expect(result.price).toBe(2500);
    expect(result.status).toBe(MEMBERSHIP_STATUS.ACTIVE);
    expect(new Date(result.endDate).getMonth()).toBe(8); // September (month 8, 0-indexed)
  });

  it('should filter memberships strictly by branchId when provided', async () => {
    const orgId = new Types.ObjectId().toString();
    const branchId = new Types.ObjectId().toString();

    const mockQueryChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ _id: new Types.ObjectId(), branchId: new Types.ObjectId(branchId) }]),
    };

    mockMembershipModel.find.mockReturnValue(mockQueryChain);
    mockMembershipModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    const result = await service.findAllByOrganization(orgId, 1, 20, undefined, branchId);

    expect(mockMembershipModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: new Types.ObjectId(orgId),
        branchId: new Types.ObjectId(branchId),
      }),
    );
    expect(result.data).toHaveLength(1);
  });

  it('should not filter by branchId when branchId is omitted', async () => {
    const orgId = new Types.ObjectId().toString();

    const mockQueryChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    mockMembershipModel.find.mockReturnValue(mockQueryChain);
    mockMembershipModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.findAllByOrganization(orgId, 1, 20);

    const callArg = mockMembershipModel.find.mock.calls[mockMembershipModel.find.mock.calls.length - 1][0];
    expect(callArg.branchId).toBeUndefined();
  });
});
