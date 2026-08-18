import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { INVOICE_STATUS, INVOICE_SOURCE, PAYMENT_STATUS, MEMBERSHIP_STATUS } from '@klyro/config';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { CustomerMembership, CustomerMembershipDocument } from '../memberships/schemas/customer-membership.schema';
import { Invoice, InvoiceDocument } from '../gym-billing/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../gym-billing/schemas/payment.schema';
import { MembershipPlan, MembershipPlanDocument } from '../membership-plans/schemas/membership-plan.schema';
import { CustomersService } from '../customers/customers.service';
import { MembershipsService } from '../memberships/memberships.service';
import { MembershipPlansService } from '../membership-plans/membership-plans.service';
import { GymBillingService } from '../gym-billing/gym-billing.service';
import { BranchesService } from '../branches/branches.service';
import { NotificationService } from '../communications/services/notification.service';
import { OnboardMemberDto, ONBOARD_PAYMENT_MODE } from './dto/onboard-member.dto';
import { RenewMemberDto } from './dto/renew-member.dto';
import { CollectMemberPaymentDto } from './dto/collect-member-payment.dto';

@Injectable()
export class GymWorkflowService {
  private readonly logger = new Logger(GymWorkflowService.name);

  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(CustomerMembership.name)
    private readonly membershipModel: Model<CustomerMembershipDocument>,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(MembershipPlan.name)
    private readonly planModel: Model<MembershipPlanDocument>,
    private readonly customersService: CustomersService,
    private readonly membershipsService: MembershipsService,
    private readonly plansService: MembershipPlansService,
    private readonly gymBillingService: GymBillingService,
    private readonly branchesService: BranchesService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Check if a member with the given phone number already exists in the organization
   */
  async checkDuplicatePhone(organizationId: string, phone: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const customer = await this.customerModel.findOne({ organizationId: orgObjId, phone }).exec();
    if (!customer) {
      return { exists: false };
    }

    // Find current active membership if any
    const activeMem = await this.membershipModel
      .findOne({
        organizationId: orgObjId,
        customerId: customer._id,
        status: MEMBERSHIP_STATUS.ACTIVE,
      })
      .populate('membershipPlanId')
      .exec();

    // Find outstanding balance
    const openInvoices = await this.invoiceModel
      .find({
        organizationId: orgObjId,
        customerId: customer._id,
        status: { $in: [INVOICE_STATUS.OPEN, INVOICE_STATUS.PARTIALLY_PAID] },
      })
      .exec();

    const outstandingBalance = openInvoices.reduce(
      (acc, inv) => acc + Math.max(0, inv.totalAmount - (inv.paidAmount || 0)),
      0,
    );

    return {
      exists: true,
      customer: {
        _id: customer._id,
        customerCode: customer.customerCode,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        status: customer.status,
      },
      activeMembership: activeMem
        ? {
            _id: activeMem._id,
            planName: (activeMem.membershipPlanId as any)?.name || 'Membership',
            status: activeMem.status,
            endDate: activeMem.endDate,
          }
        : null,
      outstandingBalance,
    };
  }

  /**
   * Complete member onboarding workflow:
   * 1. Validate & prevent duplicate phone
   * 2. Create Customer
   * 3. Assign Membership
   * 4. Create Invoice automatically
   * 5. Record Payment if PAY_NOW
   */
  async onboardMember(organizationId: string, dto: OnboardMemberDto, recordedByUserId?: string) {
    const orgObjId = new Types.ObjectId(organizationId);

    // 1. Duplicate check
    const existing = await this.checkDuplicatePhone(organizationId, dto.phone);
    if (existing.exists) {
      throw new ConflictException({
        message: `Member with phone ${dto.phone} already exists in your organization (${existing.customer?.firstName} ${existing.customer?.lastName || ''}).`,
        existingCustomer: existing.customer,
        activeMembership: existing.activeMembership,
        outstandingBalance: existing.outstandingBalance,
      });
    }

    // 2. Resolve branch
    let branchId = dto.branchId;
    if (!branchId) {
      const branchesRes = await this.branchesService.findAllByOrganization(organizationId);
      const branches = branchesRes?.data || branchesRes;
      if (!branches || (Array.isArray(branches) && branches.length === 0)) {
        throw new BadRequestException('No branch found for organization. Please create a branch first.');
      }
      branchId = branches[0]._id.toString();
    }

    // 3. Validate membership plan
    const plan = await this.plansService.findOneByIdAndOrg(dto.membershipPlanId, organizationId);
    const discount = dto.discountAmount !== undefined ? dto.discountAmount : 0;
    const finalPrice = dto.customPrice !== undefined ? dto.customPrice : Math.max(0, plan.price - discount);

    // 4. Create customer
    const customer = await this.customersService.createCustomer(organizationId, {
      branchId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      gender: dto.gender as any,
      dateOfBirth: dto.dateOfBirth,
      emergencyContact: dto.emergencyContact ? ({ name: dto.emergencyContact } as any) : undefined,
      address: dto.address ? ({ street: dto.address } as any) : undefined,
      notes: dto.notes,
    });

    // 5. Assign membership
    const membership = await this.membershipsService.assignMembership(organizationId, {
      customerId: customer._id.toString(),
      membershipPlanId: plan._id.toString(),
      branchId,
      startDate: dto.startDate,
      customPrice: finalPrice,
    });

    // 6. Create invoice automatically
    const invoice = await this.gymBillingService.createInvoice(organizationId, {
      customerId: customer._id.toString(),
      membershipId: membership._id.toString(),
      branchId,
      subtotal: plan.price,
      discountAmount: discount,
      totalAmount: finalPrice,
      dueAt: dto.startDate || new Date().toISOString(),
      notes: `Membership Onboarding - ${plan.name}`,
    });

    // 7. Optional Payment
    let payment: PaymentDocument | undefined;
    let updatedInvoice = invoice;

    if (dto.paymentMode === ONBOARD_PAYMENT_MODE.PAY_NOW && finalPrice > 0) {
      const paymentAmount = dto.paymentAmount !== undefined ? dto.paymentAmount : finalPrice;
      const paymentMethod = dto.paymentMethod || 'UPI';

      const paymentResult = await this.gymBillingService.recordPayment(
        organizationId,
        recordedByUserId || 'system',
        {
          invoiceId: invoice._id.toString(),
          amount: paymentAmount,
          method: paymentMethod as any,
          reference: dto.paymentReference,
          notes: 'Onboarding Payment',
        },
      );

      payment = paymentResult.payment;
      updatedInvoice = paymentResult.invoice;
    }

    return {
      customer,
      membership,
      invoice: updatedInvoice,
      payment,
    };
  }

  /**
   * Streamlined renewal workflow:
   * 1. Resolve current/latest membership
   * 2. Apply early renewal rule (if active, starts after current ends; if expired, starts today)
   * 3. Create new Membership
   * 4. Create renewal Invoice
   * 5. Record optional Payment
   */
  async renewMembership(
    organizationId: string,
    customerId: string,
    dto: RenewMemberDto,
    recordedByUserId?: string,
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const customer = await this.customersService.findOneByIdAndOrg(customerId, organizationId);

    // Find latest membership
    const latestMem = await this.membershipModel
      .findOne({ organizationId: orgObjId, customerId: customer._id })
      .sort({ endDate: -1 })
      .exec();

    // Determine plan
    const planId = dto.membershipPlanId || (latestMem ? latestMem.membershipPlanId.toString() : null);
    if (!planId) {
      throw new BadRequestException('Please select a membership plan for renewal');
    }

    const plan = await this.plansService.findOneByIdAndOrg(planId, organizationId);
    const discount = dto.discountAmount !== undefined ? dto.discountAmount : 0;
    const finalPrice = dto.customPrice !== undefined ? dto.customPrice : Math.max(0, plan.price - discount);

    // Determine start date
    let startDate: string | undefined = dto.startDate;
    if (!startDate) {
      const now = new Date();
      if (latestMem && latestMem.status === MEMBERSHIP_STATUS.ACTIVE && latestMem.endDate > now) {
        // Early renewal: starts the day after current membership ends
        const nextDay = new Date(latestMem.endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        startDate = nextDay.toISOString();
      } else {
        // Expired or no active membership: starts today
        startDate = now.toISOString();
      }
    }

    const branchId = customer.branchId.toString();

    // Create new membership
    const membership = await this.membershipsService.assignMembership(organizationId, {
      customerId: customer._id.toString(),
      membershipPlanId: plan._id.toString(),
      branchId,
      startDate,
      customPrice: finalPrice,
      notes: `Renewal of ${plan.name}`,
    });

    // Create renewal invoice
    const invoice = await this.gymBillingService.createInvoice(organizationId, {
      customerId: customer._id.toString(),
      membershipId: membership._id.toString(),
      branchId,
      subtotal: plan.price,
      discountAmount: discount,
      totalAmount: finalPrice,
      dueAt: startDate,
      notes: `Membership Renewal - ${plan.name}`,
    });

    // Optional Payment
    let payment: PaymentDocument | undefined;
    let updatedInvoice = invoice;

    if (dto.paymentMode === ONBOARD_PAYMENT_MODE.PAY_NOW && finalPrice > 0) {
      const paymentAmount = dto.paymentAmount !== undefined ? dto.paymentAmount : finalPrice;
      const paymentMethod = dto.paymentMethod || 'UPI';

      const paymentResult = await this.gymBillingService.recordPayment(
        organizationId,
        recordedByUserId || 'system',
        {
          invoiceId: invoice._id.toString(),
          amount: paymentAmount,
          method: paymentMethod as any,
          reference: dto.paymentReference,
          notes: 'Renewal Payment',
        },
      );

      payment = paymentResult.payment;
      updatedInvoice = paymentResult.invoice;
    }

    return {
      customer,
      membership,
      invoice: updatedInvoice,
      payment,
    };
  }

  /**
   * Contextual payment collection for a customer:
   * 1. Resolves target invoice (or automatically picks the oldest open invoice)
   * 2. Records payment
   * 3. Returns updated invoice and payment record
   */
  async collectMemberPayment(
    organizationId: string,
    customerId: string,
    dto: CollectMemberPaymentDto,
    recordedByUserId?: string,
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const customer = await this.customersService.findOneByIdAndOrg(customerId, organizationId);

    let targetInvoice: InvoiceDocument | null = null;

    if (dto.invoiceId) {
      targetInvoice = await this.invoiceModel
        .findOne({
          _id: new Types.ObjectId(dto.invoiceId),
          organizationId: orgObjId,
          customerId: customer._id,
        })
        .exec();

      if (!targetInvoice) {
        throw new NotFoundException('Specified invoice not found for this customer');
      }
    } else {
      // Pick oldest unpaid or partially paid invoice
      targetInvoice = await this.invoiceModel
        .findOne({
          organizationId: orgObjId,
          customerId: customer._id,
          status: { $in: [INVOICE_STATUS.OPEN, INVOICE_STATUS.PARTIALLY_PAID] },
        })
        .sort({ dueAt: 1, createdAt: 1 })
        .exec();

      if (!targetInvoice) {
        throw new BadRequestException('This member has no outstanding invoices to collect payment for.');
      }
    }

    const outstanding = Math.max(0, targetInvoice.totalAmount - (targetInvoice.paidAmount || 0));
    if (dto.amount > outstanding) {
      throw new BadRequestException(
        `Payment amount (₹${dto.amount}) exceeds the outstanding balance (₹${outstanding}) for Invoice ${targetInvoice.invoiceNumber}.`,
      );
    }

    const paymentResult = await this.gymBillingService.recordPayment(
      organizationId,
      recordedByUserId || 'system',
      {
        invoiceId: targetInvoice._id.toString(),
        amount: dto.amount,
        method: dto.method as any,
        reference: dto.reference,
        notes: dto.notes || 'Contextual Customer Payment',
      },
    );

    return {
      payment: paymentResult.payment,
      invoice: paymentResult.invoice,
    };
  }
}
