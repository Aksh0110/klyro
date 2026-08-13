import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { INVOICE_STATUS, INVOICE_SOURCE, PAYMENT_STATUS } from '@klyro/config';
import { CreateInvoiceDto, RecordPaymentDto, FinancialSummaryQueryDto } from '@klyro/validation';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Counter, CounterDocument } from './schemas/counter.schema';
import { CustomerMembership, CustomerMembershipDocument } from '../memberships/schemas/customer-membership.schema';
import { CustomersService } from '../customers/customers.service';
import { BranchesService } from '../branches/branches.service';

@Injectable()
export class GymBillingService {
  private readonly logger = new Logger(GymBillingService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
    @InjectModel(CustomerMembership.name)
    private readonly membershipModel: Model<CustomerMembershipDocument>,
    private readonly customersService: CustomersService,
    private readonly branchesService: BranchesService,
  ) {}

  async generateNextInvoiceNumber(organizationId: string, session?: ClientSession): Promise<string> {
    const orgObjectId = new Types.ObjectId(organizationId);
    const options: any = { new: true, upsert: true, setDefaultsOnInsert: true };
    if (session) options.session = session;

    const counter: any = await this.counterModel.findOneAndUpdate(
      { organizationId: orgObjectId, name: 'invoice' },
      { $inc: { seq: 1 } },
      options,
    ).exec();
    return `INV-${counter ? counter.seq : 1}`;
  }

  async createInvoice(organizationId: string, dto: CreateInvoiceDto): Promise<InvoiceDocument> {
    const orgObjectId = new Types.ObjectId(organizationId);

    // Validate customer belongs to tenant
    const customer = await this.customersService.findOneByIdAndOrg(dto.customerId, organizationId);

    // Determine and validate branch
    const branchId = dto.branchId || customer.branchId.toString();
    await this.branchesService.findOneByIdAndOrg(branchId, organizationId);

    // Validate membership if supplied
    let membershipObjectId: Types.ObjectId | undefined;
    let source: string = INVOICE_SOURCE.OTHER;

    if (dto.membershipId) {
      if (!Types.ObjectId.isValid(dto.membershipId)) {
        throw new BadRequestException('Invalid membership ID format');
      }
      const membership = await this.membershipModel
        .findOne({
          _id: new Types.ObjectId(dto.membershipId),
          organizationId: orgObjectId,
        })
        .exec();

      if (!membership) {
        throw new NotFoundException('Membership not found in current organization');
      }

      if (membership.customerId.toString() !== dto.customerId) {
        throw new BadRequestException(
          `Membership ${dto.membershipId} belongs to customer ${membership.customerId}, not ${dto.customerId}`,
        );
      }

      membershipObjectId = membership._id;
      source = INVOICE_SOURCE.MEMBERSHIP;
    }

    const discountAmount = dto.discountAmount !== undefined ? dto.discountAmount : 0;
    const invoiceNumber = await this.generateNextInvoiceNumber(organizationId);
    const issuedAt = new Date();
    const invoiceDueAt = dto.dueAt ? new Date(dto.dueAt) : new Date(issuedAt.getTime() + 7 * 86400000);

    const invoice = await this.invoiceModel.create({
      organizationId: orgObjectId,
      branchId: new Types.ObjectId(branchId),
      customerId: customer._id,
      membershipId: membershipObjectId,
      invoiceNumber,
      subtotal: dto.subtotal,
      discountAmount,
      totalAmount: dto.totalAmount,
      currency: 'INR',
      status: INVOICE_STATUS.OPEN,
      source,
      issuedAt,
      dueAt: invoiceDueAt,
      notes: dto.notes,
    });

    return invoice;
  }

  async createInvoiceForMembership(
    organizationId: string,
    branchId: string,
    customerId: string,
    membershipId: string,
    amount: number,
    dueAt?: Date,
    session?: ClientSession,
  ): Promise<InvoiceDocument> {
    const orgObjectId = new Types.ObjectId(organizationId);
    const membObjectId = new Types.ObjectId(membershipId);

    // Check if invoice already exists for this membership (Idempotency)
    const existing = await this.invoiceModel
      .findOne({ organizationId: orgObjectId, membershipId: membObjectId, source: INVOICE_SOURCE.MEMBERSHIP })
      .session(session || null)
      .exec();

    if (existing) {
      this.logger.log(`Invoice already exists for membership ${membershipId}: ${existing.invoiceNumber}`);
      return existing;
    }

    const invoiceNumber = await this.generateNextInvoiceNumber(organizationId, session);
    const issuedAt = new Date();
    const invoiceDueAt = dueAt || new Date(issuedAt.getTime() + 7 * 86400000);

    try {
      const docs = await this.invoiceModel.create(
        [
          {
            organizationId: orgObjectId,
            branchId: new Types.ObjectId(branchId),
            customerId: new Types.ObjectId(customerId),
            membershipId: membObjectId,
            invoiceNumber,
            subtotal: amount,
            discountAmount: 0,
            totalAmount: amount,
            currency: 'INR',
            status: INVOICE_STATUS.OPEN,
            source: INVOICE_SOURCE.MEMBERSHIP,
            issuedAt,
            dueAt: invoiceDueAt,
          },
        ],
        { session },
      );

      return docs[0];
    } catch (err: any) {
      // Duplicate key error handler (code 11000)
      if (err.code === 11000) {
        const found = await this.invoiceModel
          .findOne({ organizationId: orgObjectId, membershipId: membObjectId, source: INVOICE_SOURCE.MEMBERSHIP })
          .session(session || null)
          .exec();
        if (found) return found;
      }
      throw err;
    }
  }

  async getInvoices(
    organizationId: string,
    customerId?: string,
    status?: string,
    branchId?: string,
  ) {
    const query: any = { organizationId: new Types.ObjectId(organizationId) };
    if (customerId) query.customerId = new Types.ObjectId(customerId);
    if (status) query.status = status;
    if (branchId) query.branchId = new Types.ObjectId(branchId);

    return this.invoiceModel
      .find(query)
      .populate('customerId', 'firstName lastName customerCode phone')
      .populate('membershipId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getInvoiceById(organizationId: string, invoiceId: string) {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new NotFoundException('Invoice not found');
    }

    const invoice = await this.invoiceModel
      .findOne({
        _id: new Types.ObjectId(invoiceId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .populate('customerId')
      .populate('membershipId')
      .exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const successfulPayments = await this.paymentModel
      .find({
        invoiceId: invoice._id,
        organizationId: new Types.ObjectId(organizationId),
        status: PAYMENT_STATUS.SUCCESS,
      })
      .exec();

    const totalPaid = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.max(0, invoice.totalAmount - totalPaid);

    return {
      invoice,
      payments: successfulPayments,
      totalPaid,
      outstanding,
    };
  }

  async recordPayment(organizationId: string, userId: string, dto: RecordPaymentDto) {
    const orgObjectId = new Types.ObjectId(organizationId);

    const invoice = await this.invoiceModel
      .findOne({ _id: new Types.ObjectId(dto.invoiceId), organizationId: orgObjectId })
      .exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found in current organization');
    }

    // Safely extract string IDs if passed as populated object or string ID
    const customerIdStr =
      typeof dto.customerId === 'object' && dto.customerId !== null
        ? (dto.customerId as any)._id?.toString() || (dto.customerId as any).toString()
        : dto.customerId?.toString();

    const membershipIdStr =
      typeof dto.membershipId === 'object' && dto.membershipId !== null
        ? (dto.membershipId as any)._id?.toString() || (dto.membershipId as any).toString()
        : dto.membershipId?.toString();

    // Ownership Validation: Verify invoice customerId and membershipId match dto
    if (customerIdStr && invoice.customerId.toString() !== customerIdStr) {
      throw new BadRequestException(
        `Invoice ${invoice.invoiceNumber} belongs to customer ${invoice.customerId}, not ${customerIdStr}`,
      );
    }

    if (membershipIdStr && invoice.membershipId && invoice.membershipId.toString() !== membershipIdStr) {
      throw new BadRequestException(
        `Invoice ${invoice.invoiceNumber} belongs to membership ${invoice.membershipId}, not ${membershipIdStr}`,
      );
    }

    if (invoice.status === INVOICE_STATUS.PAID || invoice.status === INVOICE_STATUS.VOID) {
      throw new BadRequestException(`Cannot record payment for invoice with status ${invoice.status}`);
    }

    const existingPayments = await this.paymentModel
      .find({ invoiceId: invoice._id, organizationId: orgObjectId, status: PAYMENT_STATUS.SUCCESS })
      .exec();

    const currentPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = invoice.totalAmount - currentPaid;

    if (dto.amount > outstanding) {
      throw new BadRequestException(
        `Payment amount (₹${dto.amount}) exceeds remaining outstanding balance (₹${outstanding})`,
      );
    }

    const payment = await this.paymentModel.create({
      organizationId: orgObjectId,
      branchId: invoice.branchId,
      customerId: invoice.customerId,
      invoiceId: invoice._id,
      membershipId: invoice.membershipId,
      amount: dto.amount,
      currency: 'INR',
      method: dto.method,
      status: PAYMENT_STATUS.SUCCESS,
      reference: dto.reference,
      notes: dto.notes,
      paidAt: new Date(),
      recordedBy: new Types.ObjectId(userId),
    });

    const newTotalPaid = currentPaid + dto.amount;
    if (newTotalPaid >= invoice.totalAmount) {
      invoice.status = INVOICE_STATUS.PAID;
    } else {
      invoice.status = INVOICE_STATUS.PARTIALLY_PAID;
    }
    await invoice.save();

    return {
      payment,
      invoice,
      remainingOutstanding: Math.max(0, invoice.totalAmount - newTotalPaid),
    };
  }

  async refundPayment(organizationId: string, userId: string, paymentId: string, notes?: string) {
    const orgObjectId = new Types.ObjectId(organizationId);

    const payment = await this.paymentModel
      .findOne({ _id: new Types.ObjectId(paymentId), organizationId: orgObjectId })
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (payment.status !== PAYMENT_STATUS.SUCCESS) {
      throw new BadRequestException('Only successful payments can be refunded');
    }

    payment.status = PAYMENT_STATUS.REFUNDED;
    if (notes) payment.notes = payment.notes ? `${payment.notes} | Refund: ${notes}` : `Refund: ${notes}`;
    await payment.save();

    // Recalculate remaining valid payments for invoice
    const invoice = await this.invoiceModel.findById(payment.invoiceId).exec();
    if (invoice) {
      const remainingPayments = await this.paymentModel
        .find({ invoiceId: invoice._id, organizationId: orgObjectId, status: PAYMENT_STATUS.SUCCESS })
        .exec();

      const remainingPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);

      if (remainingPaid <= 0) {
        invoice.status = INVOICE_STATUS.OPEN;
      } else if (remainingPaid < invoice.totalAmount) {
        invoice.status = INVOICE_STATUS.PARTIALLY_PAID;
      }
      await invoice.save();
    }

    return payment;
  }

  async getPayments(organizationId: string, customerId?: string, invoiceId?: string) {
    const query: any = { organizationId: new Types.ObjectId(organizationId) };
    if (customerId) query.customerId = new Types.ObjectId(customerId);
    if (invoiceId) query.invoiceId = new Types.ObjectId(invoiceId);

    return this.paymentModel
      .find(query)
      .populate('customerId', 'firstName lastName customerCode phone')
      .populate('invoiceId', 'invoiceNumber totalAmount status')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getFinancialSummary(organizationId: string, queryDto: FinancialSummaryQueryDto) {
    const orgObjectId = new Types.ObjectId(organizationId);

    const paymentMatch: any = {
      organizationId: orgObjectId,
      status: PAYMENT_STATUS.SUCCESS,
    };

    const invoiceMatch: any = {
      organizationId: orgObjectId,
    };

    if (queryDto.branchId) {
      const bId = new Types.ObjectId(queryDto.branchId);
      paymentMatch.branchId = bId;
      invoiceMatch.branchId = bId;
    }

    if (queryDto.from || queryDto.to) {
      paymentMatch.paidAt = {};
      if (queryDto.from) paymentMatch.paidAt.$gte = new Date(queryDto.from);
      if (queryDto.to) paymentMatch.paidAt.$lte = new Date(queryDto.to);
    }

    const successfulPayments = await this.paymentModel.find(paymentMatch).exec();
    const totalCollected = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

    const invoices = await this.invoiceModel.find(invoiceMatch).exec();
    const invoiceCount = invoices.length;
    const paidInvoiceCount = invoices.filter((i) => i.status === INVOICE_STATUS.PAID).length;
    const partiallyPaidInvoiceCount = invoices.filter((i) => i.status === INVOICE_STATUS.PARTIALLY_PAID).length;

    // Calculate total outstanding on non-paid invoices
    let totalOutstanding = 0;
    for (const inv of invoices) {
      if (inv.status !== INVOICE_STATUS.PAID && inv.status !== INVOICE_STATUS.VOID) {
        const invPayments = await this.paymentModel
          .find({ invoiceId: inv._id, organizationId: orgObjectId, status: PAYMENT_STATUS.SUCCESS })
          .exec();
        const paidForInv = invPayments.reduce((sum, p) => sum + p.amount, 0);
        totalOutstanding += Math.max(0, inv.totalAmount - paidForInv);
      }
    }

    return {
      totalCollected,
      totalOutstanding,
      invoiceCount,
      paidInvoiceCount,
      partiallyPaidInvoiceCount,
    };
  }
}
