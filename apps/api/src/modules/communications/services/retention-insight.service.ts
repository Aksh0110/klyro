import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomerMembership, CustomerMembershipDocument } from '../../memberships/schemas/customer-membership.schema';
import { Invoice, InvoiceDocument } from '../../gym-billing/schemas/invoice.schema';
import { Customer, CustomerDocument } from '../../customers/schemas/customer.schema';
import { Attendance, AttendanceDocument } from '../../attendance/schemas/attendance.schema';
import { Announcement, AnnouncementDocument } from '../schemas/announcement.schema';
import { RetentionAttentionItem, RetentionAttentionSummary, ANNOUNCEMENT_STATUS } from '@klyro/types';

@Injectable()
export class RetentionInsightService {
  private readonly logger = new Logger(RetentionInsightService.name);

  constructor(
    @InjectModel(CustomerMembership.name) private membershipModel: Model<CustomerMembershipDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Announcement.name) private announcementModel: Model<AnnouncementDocument>,
  ) {}

  async getRetentionSummary(organizationId: string, branchId?: string): Promise<RetentionAttentionSummary> {
    const orgObjId = new Types.ObjectId(organizationId);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    const queryBranch: any = { organizationId: orgObjId };
    if (branchId) {
      queryBranch.branchId = new Types.ObjectId(branchId);
    }

    // 1. Expiring Memberships (expiring in next 7 days or expired)
    const expiringMemberships = await this.membershipModel
      .find({
        organizationId: orgObjId,
        endDate: { $lte: sevenDaysFromNow },
      })
      .populate('customerId')
      .exec();

    let expiringAmountAtRisk = 0;
    expiringMemberships.forEach((m) => {
      expiringAmountAtRisk += (m as any).price || (m as any).pricePaid || 0;
    });

    // 2. Overdue/Outstanding Invoices
    const overdueInvoices = await this.invoiceModel
      .find({
        organizationId: orgObjId,
        status: { $in: ['OPEN', 'PARTIALLY_PAID'] },
      })
      .populate('customerId')
      .exec();

    let overdueAmountTotal = 0;
    overdueInvoices.forEach((inv) => {
      overdueAmountTotal += inv.totalAmount - (inv.paidAmount || 0);
    });

    // 3. Inactive Members
    const activeCustomers = await this.customerModel.find({
      organizationId: orgObjId,
      status: 'ACTIVE',
    }).exec();

    const attentionItemsMap = new Map<string, RetentionAttentionItem>();

    for (const c of activeCustomers) {
      const cId = c._id.toString();

      // Check last attendance
      const lastCheckIn = await this.attendanceModel.findOne({
        organizationId: orgObjId,
        customerId: c._id,
      }).sort({ checkInAt: -1 }).exec();

      const daysInactive = lastCheckIn
        ? Math.floor((now.getTime() - new Date(lastCheckIn.checkInAt).getTime()) / (1000 * 3600 * 24))
        : 30; // default 30 if never checked in

      const isInactive = daysInactive >= 7;

      // Check if expiring
      const expMem = expiringMemberships.find((m) => {
        const cust = m.customerId as any;
        return cust && (cust._id?.toString() === cId || cust.toString() === cId);
      });

      const daysLeft = expMem && expMem.endDate
        ? Math.ceil((new Date(expMem.endDate).getTime() - now.getTime()) / (1000 * 3600 * 24))
        : undefined;

      // Check if overdue
      const inv = overdueInvoices.find((i) => {
        const cust = i.customerId as any;
        return cust && (cust._id?.toString() === cId || cust.toString() === cId);
      });
      const overdueAmt = inv ? inv.totalAmount - (inv.paidAmount || 0) : undefined;

      if (expMem || inv || isInactive) {
        let attentionType: 'EXPIRING' | 'OVERDUE' | 'INACTIVE' | 'HIGH_ATTENTION' = 'INACTIVE';
        if (expMem && inv && isInactive) attentionType = 'HIGH_ATTENTION';
        else if (expMem) attentionType = 'EXPIRING';
        else if (inv) attentionType = 'OVERDUE';

        attentionItemsMap.set(cId, {
          customerId: cId,
          customerName: `${c.firstName} ${c.lastName || ''}`.trim(),
          phone: c.phone,
          lastVisitAt: lastCheckIn?.checkInAt,
          daysInactive,
          expiringDaysLeft: daysLeft,
          membershipExpiryDate: expMem?.endDate,
          overdueAmount: overdueAmt,
          attentionType,
        });
      }
    }

    // 4. Scheduled Announcements Count
    const scheduledAnnouncementsCount = await this.announcementModel.countDocuments({
      organizationId: orgObjId,
      status: ANNOUNCEMENT_STATUS.SCHEDULED,
    });

    const attentionItems = Array.from(attentionItemsMap.values());
    attentionItems.sort((a, b) => {
      if (a.attentionType === 'HIGH_ATTENTION') return -1;
      if (b.attentionType === 'HIGH_ATTENTION') return 1;
      return (b.overdueAmount || 0) - (a.overdueAmount || 0);
    });

    return {
      expiringCount: expiringMemberships.length,
      expiringAmountAtRisk,
      overdueCount: overdueInvoices.length,
      overdueAmountTotal,
      inactiveCount: attentionItems.filter((i) => i.daysInactive && i.daysInactive >= 7).length,
      scheduledAnnouncementsCount,
      attentionItems: attentionItems.slice(0, 50),
    };
  }
}
