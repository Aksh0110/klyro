import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SelfCheckInDto } from '@klyro/validation';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Branch, BranchDocument } from '../branches/schemas/branch.schema';
import { MembershipAccessService } from './services/membership-access.service';
import { GpsValidationService } from './services/gps-validation.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
    private readonly membershipAccessService: MembershipAccessService,
    private readonly gpsValidationService: GpsValidationService,
  ) {}

  /**
   * Helper to format current date in Asia/Kolkata (YYYY-MM-DD)
   */
  private getFormattedDateString(date: Date = new Date(), timeZone: string = 'Asia/Kolkata'): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }

  async selfCheckIn(user: any, organizationId: string, activeBranchId: string | undefined, dto: SelfCheckInDto) {
    const orgObjectId = new Types.ObjectId(organizationId);

    // 1. Resolve linked Customer
    const userObjectId = Types.ObjectId.isValid(user._id || user.id) ? new Types.ObjectId(user._id || user.id) : null;
    const query: any = { organizationId: orgObjectId };
    if (userObjectId && user.phone) {
      query.$or = [{ userId: userObjectId }, { phone: user.phone }];
    } else if (userObjectId) {
      query.userId = userObjectId;
    } else if (user.phone) {
      query.phone = user.phone;
    } else {
      throw new BadRequestException('Invalid user context for self check-in');
    }

    const customer = await this.customerModel.findOne(query).exec();
    if (!customer) {
      throw new BadRequestException('Self check-in unavailable. Your Klyro member account is not linked to a gym member profile.');
    }

    // 2. Resolve Branch
    const targetBranchId = activeBranchId || customer.branchId?.toString();
    if (!targetBranchId || !Types.ObjectId.isValid(targetBranchId)) {
      throw new BadRequestException('Unable to resolve gym branch for check-in');
    }

    const branch = await this.branchModel.findOne({
      _id: new Types.ObjectId(targetBranchId),
      organizationId: orgObjectId,
    }).exec();

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // 3. Check Self Check-in Enabled
    if (!branch.settings?.memberSelfCheckInEnabled) {
      throw new BadRequestException('Check-in is currently disabled by your gym.');
    }

    // 4. Validate Branch Location Coordinates
    const branchLat = branch.location?.latitude;
    const branchLng = branch.location?.longitude;
    if (branchLat === undefined || branchLat === null || branchLng === undefined || branchLng === null) {
      throw new BadRequestException('Gym location is not configured for self check-in.');
    }

    // 5. Evaluate Membership Status
    const access = await this.membershipAccessService.evaluateAccess(organizationId, customer._id.toString());
    if (access.reason === 'MEMBERSHIP_EXPIRED') {
      throw new BadRequestException('Your membership has expired.');
    }
    if (!access.allowed) {
      throw new BadRequestException("You don't have an active membership for this gym.");
    }

    // 6. Evaluate GPS Distance & Accuracy
    const radiusMeters = branch.settings?.selfCheckInRadiusMeters || 100;
    const gpsResult = this.gpsValidationService.evaluateLocation(
      dto.latitude,
      dto.longitude,
      dto.accuracyMeters,
      branchLat,
      branchLng,
      radiusMeters,
    );

    if (!gpsResult.allowed) {
      throw new BadRequestException(gpsResult.message || "You're outside the gym's check-in area. Move closer to the gym and try again.");
    }

    // 7. Determine Attendance Date (Server Authoritative)
    const now = new Date();
    const attendanceDate = this.getFormattedDateString(now);

    // 8. Idempotent Duplicate Same-Day Check-in Check
    const existingAttendance = await this.attendanceModel.findOne({
      organizationId: orgObjectId,
      customerId: customer._id,
      attendanceDate,
    }).exec();

    if (existingAttendance) {
      return {
        status: 'ALREADY_CHECKED_IN',
        message: "✓ You're already checked in today",
        checkInAt: existingAttendance.checkInAt,
        attendance: existingAttendance,
      };
    }

    // 9. Save Attendance Record
    const newAttendance = await this.attendanceModel.create({
      organizationId: orgObjectId,
      branchId: branch._id,
      customerId: customer._id,
      membershipId: access.membership?._id,
      attendanceDate,
      checkInAt: now,
      source: 'GPS_SELF_CHECKIN',
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracyMeters: dto.accuracyMeters,
      recordedBy: userObjectId || undefined,
    });

    return {
      status: 'SUCCESS',
      message: '✓ Check-in successful',
      attendance: newAttendance,
    };
  }

  async getMyAttendance(user: any, organizationId: string) {
    const orgObjectId = new Types.ObjectId(organizationId);
    const userObjectId = Types.ObjectId.isValid(user._id || user.id) ? new Types.ObjectId(user._id || user.id) : null;

    const query: any = { organizationId: orgObjectId };
    if (userObjectId && user.phone) {
      query.$or = [{ userId: userObjectId }, { phone: user.phone }];
    } else if (userObjectId) {
      query.userId = userObjectId;
    } else if (user.phone) {
      query.phone = user.phone;
    } else {
      return [];
    }

    const customer = await this.customerModel.findOne(query).exec();
    if (!customer) {
      return [];
    }

    return this.attendanceModel
      .find({
        organizationId: orgObjectId,
        customerId: customer._id,
      })
      .sort({ checkInAt: -1 })
      .exec();
  }

  async getCustomerAttendance(customerId: string, organizationId: string) {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new NotFoundException('Invalid customer ID');
    }
    const orgObjectId = new Types.ObjectId(organizationId);
    const custObjectId = new Types.ObjectId(customerId);

    return this.attendanceModel
      .find({
        organizationId: orgObjectId,
        customerId: custObjectId,
      })
      .sort({ checkInAt: -1 })
      .exec();
  }

  async getAttendanceSummary(organizationId: string, branchId?: string) {
    const orgObjectId = new Types.ObjectId(organizationId);
    const query: any = { organizationId: orgObjectId };

    if (branchId && Types.ObjectId.isValid(branchId)) {
      query.branchId = new Types.ObjectId(branchId);
    }

    const todayStr = this.getFormattedDateString(new Date());

    const [todayCheckIns, activeMembers, totalCheckInsLast30Days] = await Promise.all([
      this.attendanceModel.countDocuments({ ...query, attendanceDate: todayStr }).exec(),
      this.customerModel.countDocuments({ ...query, status: 'ACTIVE' }).exec(),
      this.attendanceModel.countDocuments({
        ...query,
        checkInAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }).exec(),
    ]);

    const averageDailyVisits = Math.round((totalCheckInsLast30Days / 30) * 10) / 10;

    return {
      todayCheckIns,
      activeMembers,
      averageDailyVisits,
    };
  }

  async getTodayAttendanceList(organizationId: string, branchId?: string) {
    const orgObjectId = new Types.ObjectId(organizationId);
    const todayStr = this.getFormattedDateString(new Date());

    const query: any = {
      organizationId: orgObjectId,
      attendanceDate: todayStr,
    };

    if (branchId && Types.ObjectId.isValid(branchId)) {
      query.branchId = new Types.ObjectId(branchId);
    }

    return this.attendanceModel
      .find(query)
      .populate('customerId', 'firstName lastName phone customerCode')
      .sort({ checkInAt: -1 })
      .exec();
  }
}
