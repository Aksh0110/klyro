import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MembershipAccessService } from './services/membership-access.service';
import { GpsValidationService } from './services/gps-validation.service';
import { Attendance } from './schemas/attendance.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { Branch } from '../branches/schemas/branch.schema';

describe('Attendance & GPS Self Check-In Service (Milestone 4)', () => {
  let attendanceService: AttendanceService;
  let gpsValidationService: GpsValidationService;

  const mockAttendanceModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockCustomerModel = {
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockBranchModel = {
    findOne: jest.fn(),
  };

  const mockMembershipAccessService = {
    evaluateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        GpsValidationService,
        {
          provide: MembershipAccessService,
          useValue: mockMembershipAccessService,
        },
        {
          provide: getModelToken(Attendance.name),
          useValue: mockAttendanceModel,
        },
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel,
        },
        {
          provide: getModelToken(Branch.name),
          useValue: mockBranchModel,
        },
      ],
    }).compile();

    attendanceService = module.get<AttendanceService>(AttendanceService);
    gpsValidationService = module.get<GpsValidationService>(GpsValidationService);
    jest.clearAllMocks();
  });

  describe('GpsValidationService (Haversine & Radius)', () => {
    it('should correctly calculate distance using Haversine formula', () => {
      // Gym at Nagpur: (21.1458, 79.0882)
      // Member 50 meters away: (21.1462, 79.0882)
      const distance = gpsValidationService.calculateHaversineDistanceMeters(21.1462, 79.0882, 21.1458, 79.0882);
      expect(distance).toBeGreaterThan(30);
      expect(distance).toBeLessThan(70);
    });

    it('should allow check-in when within configured radius (100m)', () => {
      const result = gpsValidationService.evaluateLocation(21.1460, 79.0882, 10, 21.1458, 79.0882, 100);
      expect(result.allowed).toBe(true);
    });

    it('should reject check-in when outside radius (e.g. 500m away)', () => {
      const result = gpsValidationService.evaluateLocation(21.1500, 79.0882, 10, 21.1458, 79.0882, 100);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('OUTSIDE_CHECKIN_RADIUS');
    });

    it('should reject check-in when GPS accuracy is too poor', () => {
      const result = gpsValidationService.evaluateLocation(21.1458, 79.0882, 500, 21.1458, 79.0882, 100);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('GPS_ACCURACY_UNRELIABLE');
    });
  });

  describe('AttendanceService.selfCheckIn', () => {
    const mockUser = { _id: '507f1f77bcf86cd799439011', phone: '+919876543210' };
    const mockOrgId = '507f1f77bcf86cd799439012';
    const mockBranchId = '507f1f77bcf86cd799439013';
    const mockCustomerId = '507f1f77bcf86cd799439014';

    it('should throw BadRequestException if customer profile is not linked', async () => {
      mockCustomerModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        attendanceService.selfCheckIn(mockUser, mockOrgId, mockBranchId, { latitude: 21.1458, longitude: 79.0882, accuracyMeters: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if self check-in is disabled on branch', async () => {
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: mockCustomerId, branchId: mockBranchId }),
      });
      mockBranchModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockBranchId,
          settings: { memberSelfCheckInEnabled: false, selfCheckInRadiusMeters: 100 },
          location: { latitude: 21.1458, longitude: 79.0882 },
        }),
      });

      await expect(
        attendanceService.selfCheckIn(mockUser, mockOrgId, mockBranchId, { latitude: 21.1458, longitude: 79.0882, accuracyMeters: 10 }),
      ).rejects.toThrow('Check-in is currently disabled by your gym.');
    });

    it('should throw BadRequestException if membership is expired', async () => {
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: mockCustomerId, branchId: mockBranchId }),
      });
      mockBranchModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockBranchId,
          settings: { memberSelfCheckInEnabled: true, selfCheckInRadiusMeters: 100 },
          location: { latitude: 21.1458, longitude: 79.0882 },
        }),
      });
      mockMembershipAccessService.evaluateAccess.mockResolvedValue({
        allowed: false,
        reason: 'MEMBERSHIP_EXPIRED',
      });

      await expect(
        attendanceService.selfCheckIn(mockUser, mockOrgId, mockBranchId, { latitude: 21.1458, longitude: 79.0882, accuracyMeters: 10 }),
      ).rejects.toThrow('Your membership has expired.');
    });

    it('should return ALREADY_CHECKED_IN idempotently if checked in today', async () => {
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: mockCustomerId, branchId: mockBranchId }),
      });
      mockBranchModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockBranchId,
          settings: { memberSelfCheckInEnabled: true, selfCheckInRadiusMeters: 100 },
          location: { latitude: 21.1458, longitude: 79.0882 },
        }),
      });
      mockMembershipAccessService.evaluateAccess.mockResolvedValue({
        allowed: true,
        reason: 'ACTIVE_MEMBERSHIP',
        membership: { _id: '507f1f77bcf86cd799439015' },
      });
      mockAttendanceModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439016',
          checkInAt: new Date(),
        }),
      });

      const res = await attendanceService.selfCheckIn(mockUser, mockOrgId, mockBranchId, {
        latitude: 21.1458,
        longitude: 79.0882,
        accuracyMeters: 10,
      });

      expect(res.status).toBe('ALREADY_CHECKED_IN');
      expect(res.message).toContain('already checked in today');
    });

    it('should create attendance record on successful self check-in', async () => {
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: mockCustomerId, branchId: mockBranchId }),
      });
      mockBranchModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mockBranchId,
          settings: { memberSelfCheckInEnabled: true, selfCheckInRadiusMeters: 100 },
          location: { latitude: 21.1458, longitude: 79.0882 },
        }),
      });
      mockMembershipAccessService.evaluateAccess.mockResolvedValue({
        allowed: true,
        reason: 'ACTIVE_MEMBERSHIP',
        membership: { _id: '507f1f77bcf86cd799439015' },
      });
      mockAttendanceModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockAttendanceModel.create.mockResolvedValue({
        _id: '507f1f77bcf86cd799439017',
        source: 'GPS_SELF_CHECKIN',
        checkInAt: new Date(),
      });

      const res = await attendanceService.selfCheckIn(mockUser, mockOrgId, mockBranchId, {
        latitude: 21.1458,
        longitude: 79.0882,
        accuracyMeters: 10,
      });

      expect(res.status).toBe('SUCCESS');
      expect(res.attendance.source).toBe('GPS_SELF_CHECKIN');
    });
  });
});
