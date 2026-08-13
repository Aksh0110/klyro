import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { USER_STATUS, ROLES } from '@klyro/config';
import { Types } from 'mongoose';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should create user with ACTIVE status', async () => {
    const mockCreatedUser = {
      _id: new Types.ObjectId(),
      phone: '+919876543210',
      status: USER_STATUS.ACTIVE,
      organizationIds: [],
      roles: [],
    };
    mockUserModel.create.mockResolvedValue(mockCreatedUser);

    const user = await service.createUser('+919876543210');
    expect(user.phone).toBe('+919876543210');
    expect(user.status).toBe(USER_STATUS.ACTIVE);
  });

  it('should add organization role assignment to user', async () => {
    const orgId = new Types.ObjectId();
    const mockUser = {
      _id: new Types.ObjectId(),
      organizationIds: [],
      roles: [],
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    };

    mockUserModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const updatedUser = await service.addOrganizationRole(
      mockUser._id.toString(),
      orgId,
      ROLES.OWNER,
    );

    expect(updatedUser.organizationIds.length).toBe(1);
    expect(updatedUser.roles[0].role).toBe(ROLES.OWNER);
  });
});
