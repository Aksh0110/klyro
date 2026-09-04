import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { SubscriptionPlan } from './schemas/subscription-plan.schema';
import { Subscription } from './schemas/subscription.schema';
import { SubscriptionPayment } from './schemas/subscription-payment.schema';
import { SubscriptionMandate } from './schemas/subscription-mandate.schema';
import { DevPaymentProvider } from './providers/dev-payment.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { Types } from 'mongoose';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_PAYMENT_STATUS, MANDATE_STATUS } from '@klyro/config';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockPlanModel: any;
  let mockSubModel: any;
  let mockSubPaymentModel: any;
  let mockMandateModel: any;

  beforeEach(async () => {
    mockPlanModel = {
      updateOne: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };
    mockSubModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    mockSubPaymentModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
    };
    mockMandateModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        DevPaymentProvider,
        RazorpayProvider,
        {
          provide: ConfigService,
          useValue: { get: () => 'development' },
        },
        { provide: getModelToken(SubscriptionPlan.name), useValue: mockPlanModel },
        { provide: getModelToken(Subscription.name), useValue: mockSubModel },
        { provide: getModelToken(SubscriptionPayment.name), useValue: mockSubPaymentModel },
        { provide: getModelToken(SubscriptionMandate.name), useValue: mockMandateModel },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should initialize checkout and create payment record for new subscription', async () => {
    const orgId = new Types.ObjectId().toString();
    const planId = new Types.ObjectId().toString();

    mockPlanModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: planId,
        code: 'GROWTH',
        monthlyPrice: 799,
      }),
    });

    mockSubModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockSubModel.create.mockImplementation((dto: any) =>
      Promise.resolve({ ...dto, _id: new Types.ObjectId(), save: jest.fn() }),
    );
    mockSubPaymentModel.create.mockImplementation((dto: any) => Promise.resolve(dto));

    const result = await service.checkout(orgId, { subscriptionPlanId: planId });

    expect(result.subscription.amount).toBe(799);
    expect(result.subscription.status).toBe(SUBSCRIPTION_STATUS.PENDING_PAYMENT);
    expect(result.payment.status).toBe('PENDING');
  });

  it('should safely retain ACTIVE plan and record pendingPlanId when changing plan', async () => {
    const orgId = new Types.ObjectId().toString();
    const existingPlanId = new Types.ObjectId();
    const newPlanId = new Types.ObjectId().toString();

    const existingSub = {
      _id: new Types.ObjectId(),
      subscriptionPlanId: existingPlanId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      amount: 499,
      currentPeriodStart: new Date('2026-08-01'),
      currentPeriodEnd: new Date('2026-09-01'),
      pendingPlanId: undefined,
      pendingProviderSubscriptionId: undefined,
      save: jest.fn().mockResolvedValue(true),
    };

    mockPlanModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: newPlanId,
        code: 'GROWTH',
        monthlyPrice: 799,
        name: 'Growth',
      }),
    });

    mockSubModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existingSub) });
    mockSubPaymentModel.create.mockImplementation((dto: any) => Promise.resolve(dto));

    const result = await service.checkout(orgId, { subscriptionPlanId: newPlanId });

    // Status and active plan MUST remain unchanged for safe fallback!
    expect(existingSub.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
    expect(existingSub.subscriptionPlanId).toBe(existingPlanId);
    expect(existingSub.pendingPlanId).toBe(newPlanId);
    expect(result.isPlanChange).toBe(true);
    expect(existingSub.save).toHaveBeenCalled();
  });

  it('should safely fall back and clear pendingPlanId on cancelCheckout', async () => {
    const orgId = new Types.ObjectId().toString();
    const existingPlanId = new Types.ObjectId();

    const existingSub = {
      _id: new Types.ObjectId(),
      subscriptionPlanId: existingPlanId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      pendingPlanId: new Types.ObjectId(),
      pendingProviderSubscriptionId: 'order_123',
      save: jest.fn().mockResolvedValue(true),
    };

    const mockPendingPayment = {
      status: 'PENDING',
      save: jest.fn().mockResolvedValue(true),
      metadata: {},
    };

    mockSubModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existingSub) });
    mockSubPaymentModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockPendingPayment) }),
    });

    const res = await service.cancelCheckout(orgId, { orderId: 'order_123', reason: 'USER_CANCELLED' });

    expect(res.success).toBe(true);
    expect(existingSub.pendingPlanId).toBeUndefined();
    expect(existingSub.pendingProviderSubscriptionId).toBeUndefined();
    expect(existingSub.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
    expect(mockPendingPayment.status).toBe(SUBSCRIPTION_PAYMENT_STATUS.FAILED);
  });

  it('should immediately start new plan and reset 30-day billing cycle upon verifyPayment', async () => {
    const orgId = new Types.ObjectId().toString();
    const oldPlanId = new Types.ObjectId();
    const newPlanId = new Types.ObjectId().toString();

    const existingSub = {
      _id: new Types.ObjectId(),
      subscriptionPlanId: oldPlanId,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      pendingPlanId: newPlanId,
      amount: 499,
      currentPeriodStart: new Date('2026-08-01'),
      currentPeriodEnd: new Date('2026-09-01'),
      save: jest.fn().mockResolvedValue(true),
    };

    mockPlanModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: newPlanId,
        code: 'GROWTH',
        monthlyPrice: 799,
        name: 'Growth',
      }),
    });

    mockSubModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existingSub) });
    mockSubPaymentModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockSubPaymentModel.create.mockImplementation((dto: any) =>
      Promise.resolve({ ...dto, save: jest.fn() }),
    );

    const res = await service.verifyPayment(orgId, {
      subscriptionPlanId: newPlanId,
      razorpayPaymentId: 'pay_12345',
      razorpayOrderId: 'order_12345',
    });

    expect(res.success).toBe(true);
    expect(existingSub.subscriptionPlanId.toString()).toBe(newPlanId);
    expect(existingSub.amount).toBe(799);
    expect(existingSub.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
    expect(existingSub.pendingPlanId).toBeUndefined();
    // Verify start date is now (starts immediately)
    expect(new Date(existingSub.currentPeriodStart).getTime()).toBeGreaterThan(new Date('2026-08-01').getTime());
    expect(existingSub.save).toHaveBeenCalled();
  });

  it('should activate subscription when AutoPay mandate is setup', async () => {
    const orgId = new Types.ObjectId().toString();
    const subId = new Types.ObjectId();

    const mockSubDoc = {
      _id: subId,
      status: SUBSCRIPTION_STATUS.PENDING_PAYMENT,
      save: jest.fn(),
    };

    mockSubModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockSubDoc) });
    mockMandateModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockMandateModel.create.mockImplementation((dto: any) => Promise.resolve({ ...dto, status: MANDATE_STATUS.ACTIVE }));

    const result = await service.setupAutopay(orgId, { method: 'UPI_AUTOPAY' });

    expect(mockSubDoc.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
    expect(mockSubDoc.save).toHaveBeenCalled();
  });
});
