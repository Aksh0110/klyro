import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { OtpRequest, OtpRequestDocument } from '../otp-requests/schemas/otp-request.schema';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OtpRequest.name)
    private readonly otpRequestModel: Model<OtpRequestDocument>,
    private readonly configService: ConfigService,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string; expiresInSeconds: number; devOtp?: string }> {
    const existingActiveRequest = await this.otpRequestModel
      .findOne({ phone, verified: false, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .exec();

    // Resend protection: 60-second cooldown
    if (existingActiveRequest) {
      const createdAtDate = (existingActiveRequest as any).createdAt
        ? new Date((existingActiveRequest as any).createdAt)
        : new Date();
      const secondsSinceLastReq = (Date.now() - createdAtDate.getTime()) / 1000;
      if (secondsSinceLastReq < 60) {
        throw new HttpException(
          `Please wait ${Math.ceil(60 - secondsSinceLastReq)} seconds before requesting a new OTP`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const devOtpEnabled = this.configService.get<string>('DEV_OTP_ENABLED') === 'true' || process.env.NODE_ENV !== 'production';
    const defaultDevOtp = this.configService.get<string>('DEFAULT_DEV_OTP') || '123456';

    const otpCode = devOtpEnabled ? defaultDevOtp : Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.otpRequestModel.create({
      phone,
      otpHash,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    return {
      message: 'OTP sent successfully',
      expiresInSeconds: 600,
      ...(devOtpEnabled ? { devOtp: otpCode } : {}),
    };
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const activeRequest = await this.otpRequestModel
      .findOne({ phone, verified: false, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .exec();

    if (!activeRequest) {
      throw new BadRequestException('Invalid or expired OTP. Please request a new code.');
    }

    if (activeRequest.attempts >= 3) {
      throw new BadRequestException('Maximum OTP verification attempts exceeded. Please request a new code.');
    }

    const isMatch = await bcrypt.compare(otp, activeRequest.otpHash);
    if (!isMatch) {
      activeRequest.attempts += 1;
      await activeRequest.save();
      throw new BadRequestException('Invalid OTP code. Please try again.');
    }

    activeRequest.verified = true;
    await activeRequest.save();
    return true;
  }
}
