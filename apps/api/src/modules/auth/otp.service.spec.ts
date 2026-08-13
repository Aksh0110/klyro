import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpRequest } from '../otp-requests/schemas/otp-request.schema';

describe('OtpService', () => {
  let service: OtpService;
  let mockOtpRequestModel: any;

  beforeEach(async () => {
    mockOtpRequestModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: getModelToken(OtpRequest.name),
          useValue: mockOtpRequestModel,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'DEV_OTP_ENABLED') return 'true';
              if (key === 'DEFAULT_DEV_OTP') return '123456';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send dev OTP when enabled', async () => {
    mockOtpRequestModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });
    mockOtpRequestModel.create.mockResolvedValue({});

    const result = await service.sendOtp('+919876543210');
    expect(result.devOtp).toBe('123456');
    expect(result.expiresInSeconds).toBe(600);
  });

  it('should throw error when verifying invalid OTP', async () => {
    mockOtpRequestModel.findOne.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(service.verifyOtp('+919876543210', '000000')).rejects.toThrow(
      BadRequestException,
    );
  });
});
