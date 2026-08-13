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
});
