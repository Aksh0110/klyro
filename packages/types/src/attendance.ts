export type AttendanceSourceType = 'GPS_SELF_CHECKIN';

export interface IAttendance {
  _id: string;
  organizationId: string;
  branchId: string;
  customerId: string;
  membershipId?: string;
  attendanceDate: string;
  checkInAt: Date | string;
  checkOutAt?: Date | string;
  source: AttendanceSourceType;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  recordedBy?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SelfCheckInPayload {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export interface AttendanceSummary {
  todayCheckIns: number;
  activeMembers: number;
  averageDailyVisits: number;
}
