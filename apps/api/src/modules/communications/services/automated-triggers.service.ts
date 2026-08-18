import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomerMembership, CustomerMembershipDocument } from '../../memberships/schemas/customer-membership.schema';
import { Invoice, InvoiceDocument } from '../../gym-billing/schemas/invoice.schema';
import { Customer, CustomerDocument } from '../../customers/schemas/customer.schema';
import { Attendance, AttendanceDocument } from '../../attendance/schemas/attendance.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { NotificationService } from './notification.service';
import { NOTIFICATION_TYPES, NotificationType } from '@klyro/config';

export interface TriggerExecutionResult {
  evaluated: number;
  notificationsCreated: number;
  duplicatesSkipped: number;
  processed: number;
}

@Injectable()
export class AutomatedTriggersService {
  private readonly logger = new Logger(AutomatedTriggersService.name);

  constructor(
    @InjectModel(CustomerMembership.name) private membershipModel: Model<CustomerMembershipDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async processAutomatedTriggers(organizationId?: string): Promise<TriggerExecutionResult> {
    const stats: TriggerExecutionResult = {
      evaluated: 0,
      notificationsCreated: 0,
      duplicatesSkipped: 0,
      processed: 0,
    };

    const expStats = await this.processExpiringMemberships(organizationId);
    stats.evaluated += expStats.evaluated;
    stats.notificationsCreated += expStats.notificationsCreated;
    stats.duplicatesSkipped += expStats.duplicatesSkipped;

    const invStats = await this.processInvoiceReminders(organizationId);
    stats.evaluated += invStats.evaluated;
    stats.notificationsCreated += invStats.notificationsCreated;
    stats.duplicatesSkipped += invStats.duplicatesSkipped;

    const inactStats = await this.processInactivityReminders(organizationId);
    stats.evaluated += inactStats.evaluated;
    stats.notificationsCreated += inactStats.notificationsCreated;
    stats.duplicatesSkipped += inactStats.duplicatesSkipped;

    stats.processed = stats.notificationsCreated;
    return stats;
  }

  private async resolveUserForCustomer(customer: CustomerDocument): Promise<UserDocument | null> {
    const cAny = customer as any;
    if (cAny.userId) {
      const u = await this.userModel.findById(cAny.userId).exec();
      if (u) return u;
    }
    if (customer.phone) {
      const u = await this.userModel.findOne({ phone: customer.phone }).exec();
      if (u) return u;
    }
    return null;
  }

  async processExpiringMemberships(organizationId?: string): Promise<{ evaluated: number; notificationsCreated: number; duplicatesSkipped: number }> {
    const now = new Date();
    const query: any = { status: 'ACTIVE' };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const activeMemberships = await this.membershipModel.find(query).populate('customerId').exec();

    let evaluated = 0;
    let notificationsCreated = 0;
    let duplicatesSkipped = 0;
    const todayStr = now.toISOString().split('T')[0];

    for (const mem of activeMemberships) {
      if (!mem.endDate) continue;
      evaluated++;
      const endDate = new Date(mem.endDate);
      const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      const customer = mem.customerId as any as CustomerDocument;
      if (!customer) continue;

      const user = await this.resolveUserForCustomer(customer);
      if (!user) continue;

      let triggerKey: string | null = null;
      let title = '';
      let body = '';
      let type: NotificationType = NOTIFICATION_TYPES.MEMBERSHIP_EXPIRING;

      if (diffDays === 7) {
        triggerKey = `expiring:7d:${customer._id}:${mem._id}:${todayStr}`;
        title = 'Membership Expiring Soon (7 Days)';
        body = `Hi ${customer.firstName}, your membership expires in 7 days on ${endDate.toLocaleDateString()}. Renew early to stay active!`;
      } else if (diffDays === 3) {
        triggerKey = `expiring:3d:${customer._id}:${mem._id}:${todayStr}`;
        title = 'Membership Expiring Soon (3 Days)';
        body = `Hi ${customer.firstName}, your membership expires in 3 days. Renew now at the front desk.`;
      } else if (diffDays === 1) {
        triggerKey = `expiring:1d:${customer._id}:${mem._id}:${todayStr}`;
        title = 'Membership Expires Tomorrow!';
        body = `Hi ${customer.firstName}, your membership expires tomorrow. Don't miss your workout routine!`;
      } else if (diffDays <= 0) {
        triggerKey = `expired:${customer._id}:${mem._id}:${todayStr}`;
        type = NOTIFICATION_TYPES.MEMBERSHIP_EXPIRED;
        title = 'Membership Expired';
        body = `Hi ${customer.firstName}, your gym membership has expired. Renew your plan to resume self check-in access.`;
      }

      if (triggerKey) {
        const res = await this.notificationService.createNotificationWithResult({
          organizationId: mem.organizationId,
          recipientUserId: user._id as Types.ObjectId,
          customerId: customer._id as Types.ObjectId,
          type,
          title,
          body,
          eventKey: triggerKey,
        });

        if (res.created) {
          notificationsCreated++;
        } else if (res.isDuplicate) {
          duplicatesSkipped++;
        }
      }
    }
    return { evaluated, notificationsCreated, duplicatesSkipped };
  }

  async processInvoiceReminders(organizationId?: string): Promise<{ evaluated: number; notificationsCreated: number; duplicatesSkipped: number }> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const query: any = { status: { $in: ['OPEN', 'PARTIALLY_PAID'] } };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const unpaidInvoices = await this.invoiceModel.find(query).populate('customerId').exec();

    let evaluated = 0;
    let notificationsCreated = 0;
    let duplicatesSkipped = 0;

    for (const inv of unpaidInvoices) {
      if (!inv.dueAt) continue;
      evaluated++;
      const dueAt = new Date(inv.dueAt);
      const customer = inv.customerId as any as CustomerDocument;
      if (!customer) continue;

      const user = await this.resolveUserForCustomer(customer);
      if (!user) continue;

      const isOverdue = now.getTime() > dueAt.getTime();
      const isDueToday = dueAt.toISOString().split('T')[0] === todayStr;

      if (isDueToday) {
        const triggerKey = `invoice:due:${inv._id}:${todayStr}`;
        const res = await this.notificationService.createNotificationWithResult({
          organizationId: inv.organizationId,
          recipientUserId: user._id as Types.ObjectId,
          customerId: customer._id as Types.ObjectId,
          type: NOTIFICATION_TYPES.INVOICE_DUE,
          title: 'Invoice Due Today',
          body: `Hi ${customer.firstName}, invoice #${inv.invoiceNumber} for ₹${inv.totalAmount - (inv.paidAmount || 0)} is due today.`,
          eventKey: triggerKey,
        });
        if (res.created) notificationsCreated++;
        else if (res.isDuplicate) duplicatesSkipped++;
      } else if (isOverdue) {
        const triggerKey = `invoice:overdue:${inv._id}:${todayStr}`;
        const res = await this.notificationService.createNotificationWithResult({
          organizationId: inv.organizationId,
          recipientUserId: user._id as Types.ObjectId,
          customerId: customer._id as Types.ObjectId,
          type: NOTIFICATION_TYPES.INVOICE_OVERDUE,
          title: 'Invoice Overdue',
          body: `Hi ${customer.firstName}, invoice #${inv.invoiceNumber} is overdue. Please settle your outstanding balance.`,
          eventKey: triggerKey,
        });
        if (res.created) notificationsCreated++;
        else if (res.isDuplicate) duplicatesSkipped++;
      }
    }
    return { evaluated, notificationsCreated, duplicatesSkipped };
  }

  async processInactivityReminders(organizationId?: string): Promise<{ evaluated: number; notificationsCreated: number; duplicatesSkipped: number }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const todayStr = now.toISOString().split('T')[0];
    const query: any = { status: 'ACTIVE' };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const activeCustomers = await this.customerModel.find(query).exec();
    let evaluated = 0;
    let notificationsCreated = 0;
    let duplicatesSkipped = 0;

    for (const customer of activeCustomers) {
      evaluated++;
      const recentVisit = await this.attendanceModel.findOne({
        customerId: customer._id,
        checkInAt: { $gte: sevenDaysAgo },
      }).exec();

      if (!recentVisit) {
        const user = await this.resolveUserForCustomer(customer);
        if (user) {
          const triggerKey = `inactive:7d:${customer._id}:${todayStr}`;
          const res = await this.notificationService.createNotificationWithResult({
            organizationId: customer.organizationId,
            recipientUserId: user._id as Types.ObjectId,
            customerId: customer._id as Types.ObjectId,
            type: NOTIFICATION_TYPES.MEMBER_INACTIVE,
            title: 'We Miss You at the Gym!',
            body: `Hi ${customer.firstName}, it's been 7 days since your last workout. Consistency is key — drop by today!`,
            eventKey: triggerKey,
          });
          if (res.created) notificationsCreated++;
          else if (res.isDuplicate) duplicatesSkipped++;
        }
      }
    }
    return { evaluated, notificationsCreated, duplicatesSkipped };
  }

  async triggerPaymentReceived(payment: any): Promise<void> {
    const customer = await this.customerModel.findById(payment.customerId).exec();
    if (!customer) return;

    const user = await this.resolveUserForCustomer(customer);
    if (!user) return;

    await this.notificationService.createNotification({
      organizationId: payment.organizationId,
      recipientUserId: user._id as Types.ObjectId,
      customerId: customer._id as Types.ObjectId,
      type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
      title: 'Payment Received',
      body: `Hi ${customer.firstName}, we have received your payment of ₹${payment.amount}. Thank you!`,
      eventKey: `payment:${payment._id}`,
    });
  }

  async triggerMembershipActivated(membership: any): Promise<void> {
    const customer = await this.customerModel.findById(membership.customerId).exec();
    if (!customer) return;

    const user = await this.resolveUserForCustomer(customer);
    if (!user) return;

    await this.notificationService.createNotification({
      organizationId: membership.organizationId,
      recipientUserId: user._id as Types.ObjectId,
      customerId: customer._id as Types.ObjectId,
      type: NOTIFICATION_TYPES.MEMBERSHIP_ACTIVATED,
      title: 'Membership Activated!',
      body: `Welcome ${customer.firstName}! Your gym membership is active. Enjoy your workouts and use device GPS for easy self check-in.`,
      eventKey: `activation:${membership._id}`,
    });
  }
}
