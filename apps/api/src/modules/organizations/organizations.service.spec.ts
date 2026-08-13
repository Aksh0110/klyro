import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrganizationsService } from './organizations.service';
import { Organization } from './schemas/organization.schema';
import { UsersService } from '../users/users.service';
import { BranchesService } from '../branches/branches.service';
import { VERTICALS, ROLES } from '@klyro/config';
import { Types } from 'mongoose';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockOrgModel: any;
  let mockUsersService: any;
  let mockBranchesService: any;

  beforeEach(async () => {
    mockOrgModel = {
      create: jest.fn(),
      findById: jest.fn(),
    };
    mockUsersService = {
      addOrganizationRole: jest.fn(),
    };
    mockBranchesService = {
      createBranch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getModelToken(Organization.name),
          useValue: mockOrgModel,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: BranchesService,
          useValue: mockBranchesService,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should create organization, assign OWNER role, and create Main Branch', async () => {
    const userId = new Types.ObjectId().toString();
    const orgId = new Types.ObjectId().toString();

    const mockOrg = {
      _id: orgId,
      name: 'Power Gym',
      vertical: VERTICALS.GYM,
    };
    const mockBranch = {
      _id: new Types.ObjectId().toString(),
      name: 'Main Branch',
      code: 'MAIN',
    };

    mockOrgModel.create.mockResolvedValue(mockOrg);
    mockUsersService.addOrganizationRole.mockResolvedValue({});
    mockBranchesService.createBranch.mockResolvedValue(mockBranch);

    const result = await service.createOrganization(userId, {
      name: 'Power Gym',
      vertical: VERTICALS.GYM,
    });

    expect(result.organization.name).toBe('Power Gym');
    expect(mockUsersService.addOrganizationRole).toHaveBeenCalledWith(userId, orgId, ROLES.OWNER);
    expect(mockBranchesService.createBranch).toHaveBeenCalledWith(orgId, {
      name: 'Main Branch',
      code: 'MAIN',
      address: undefined,
    });
  });
});
