import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { GymBillingService } from './gym-billing.service';
import { Invoice } from './schemas/invoice.schema';
import { Payment } from './schemas/payment.schema';
import { Counter } from './schemas/counter.schema';
import { CustomerMembership } from '../memberships/schemas/customer-membership.schema';
import { CustomersService } from '../customers/customers.service';
import { BranchesService } from '../branches/branches.service';
import { Types } from 'mongoose';
import { INVOICE_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '@klyro/config';
import { BadRequestException } from '@nestjs/common';

describe('GymBillingService', () => {
  let service: GymBillingService;
  let mockInvoiceModel: any;
  let mockPaymentModel: any;
  let mockCounterModel: any;
  let mockMembershipModel: any;
  let mockCustomersService: any;
  let mockBranchesService: any;

  beforeEach(async () => {
    mockInvoiceModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
    };
    mockPaymentModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    mockCounterModel = {
      findOneAndUpdate: jest.fn(),
    };
    mockMembershipModel = {
      findOne: jest.fn(),
    };
    mockCustomersService = {
      findOneByIdAndOrg: jest.fn(),
    };
    mockBranchesService = {
      findOneByIdAndOrg: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GymBillingService,
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
        { provide: getModelToken(Payment.name), useValue: mockPaymentModel },
        { provide: getModelToken(Counter.name), useValue: mockCounterModel },
        { provide: getModelToken(CustomerMembership.name), useValue: mockMembershipModel },
        { provide: CustomersService, useValue: mockCustomersService },
        { provide: BranchesService, useValue: mockBranchesService },
      ],
    }).compile();

    service = module.get<GymBillingService>(GymBillingService);
  });

  it('should record partial payment and update invoice to PARTIALLY_PAID', async () => {
    const orgId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    const invoiceId = new Types.ObjectId().toString();
    const customerId = new Types.ObjectId().toString();

    const mockInvoiceDoc = {
      _id: invoiceId,
      totalAmount: 2500,
      status: INVOICE_STATUS.OPEN,
      branchId: new Types.ObjectId(),
      customerId: new Types.ObjectId(customerId),
      save: jest.fn(),
    };

    mockInvoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockInvoiceDoc) });
    mockPaymentModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }); // No previous payments
    mockPaymentModel.create.mockImplementation((dto: any) => Promise.resolve(dto));

    const result = await service.recordPayment(orgId, userId, {
      invoiceId,
      customerId,
      amount: 1000,
      method: PAYMENT_METHOD.UPI,
    });

    expect(result.remainingOutstanding).toBe(1500);
    expect(mockInvoiceDoc.status).toBe(INVOICE_STATUS.PARTIALLY_PAID);
    expect(mockInvoiceDoc.save).toHaveBeenCalled();
  });

  it('should reject payment if amount exceeds remaining outstanding balance', async () => {
    const orgId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    const invoiceId = new Types.ObjectId().toString();
    const customerId = new Types.ObjectId().toString();

    const mockInvoiceDoc = {
      _id: invoiceId,
      totalAmount: 2500,
      status: INVOICE_STATUS.OPEN,
      customerId: new Types.ObjectId(customerId),
      save: jest.fn(),
    };

    mockInvoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockInvoiceDoc) });
    mockPaymentModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([{ amount: 1000 }]) }); // ₹1000 already paid

    await expect(
      service.recordPayment(orgId, userId, {
        invoiceId,
        customerId,
        amount: 2000, // ₹2000 > ₹1500 outstanding
        method: PAYMENT_METHOD.CASH,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject payment if customerId does not match invoice customerId', async () => {
    const orgId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    const invoiceId = new Types.ObjectId().toString();
    const actualCustomerId = new Types.ObjectId().toString();
    const mismatchedCustomerId = new Types.ObjectId().toString();

    const mockInvoiceDoc = {
      _id: invoiceId,
      totalAmount: 2500,
      status: INVOICE_STATUS.OPEN,
      customerId: new Types.ObjectId(actualCustomerId),
      save: jest.fn(),
    };

    mockInvoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockInvoiceDoc) });

    await expect(
      service.recordPayment(orgId, userId, {
        invoiceId,
        customerId: mismatchedCustomerId,
        amount: 500,
        method: PAYMENT_METHOD.UPI,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
