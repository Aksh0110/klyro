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
import { SUBSCRIPTION_STATUS, MANDATE_STATUS } from '@klyro/config';

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

  it('should initialize checkout and create payment record', async () => {
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
    expect(result.subscription.status).toBe(SUBSCRIPTION_STATUS.PENDING_AUTOPAY);
    expect(result.payment.status).toBe('SUCCESS');
  });

  it('should activate subscription when AutoPay mandate is setup', async () => {
    const orgId = new Types.ObjectId().toString();
    const subId = new Types.ObjectId();

    const mockSubDoc = {
      _id: subId,
      status: SUBSCRIPTION_STATUS.PENDING_AUTOPAY,
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
