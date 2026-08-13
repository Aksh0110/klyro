import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthResponseData, AuthTokens, JwtPayload } from '@klyro/types';
import { OtpService } from './otp.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async sendOtp(phone: string) {
    return this.otpService.sendOtp(phone);
  }

  async verifyOtp(phone: string, otp: string): Promise<AuthResponseData> {
    await this.otpService.verifyOtp(phone, otp);

    let user = await this.usersService.findByPhone(phone);
    let isNewUser = false;

    if (!user) {
      user = await this.usersService.createUser(phone);
      isNewUser = true;
    }

    await this.usersService.updateLastLogin(user._id.toString());

    const hasOrganization = user.organizationIds.length > 0;
    const primaryOrgId = hasOrganization ? user.organizationIds[0].toString() : undefined;

    const tokens = this.generateTokens({
      sub: user._id.toString(),
      phone: user.phone,
      activeOrganizationId: primaryOrgId,
    });

    return {
      user: {
        _id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        email: user.email,
        status: user.status,
        organizationIds: user.organizationIds.map((id) => id.toString()),
        roles: user.roles.map((r) => ({
          organizationId: r.organizationId.toString(),
          role: r.role,
        })),
        lastLoginAt: user.lastLoginAt,
        createdAt: (user as any).createdAt,
        updatedAt: (user as any).updatedAt,
      },
      tokens,
      isNewUser,
      hasOrganization,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'super_secret_klyro_jwt_refresh_key_dev_mode_only_987654321';
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.usersService.findById(payload.sub);
      const primaryOrgId = user.organizationIds.length > 0 ? user.organizationIds[0].toString() : undefined;

      return this.generateTokens({
        sub: user._id.toString(),
        phone: user.phone,
        activeOrganizationId: primaryOrgId,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    return {
      _id: user._id.toString(),
      phone: user.phone,
      name: user.name,
      email: user.email,
      status: user.status,
      organizationIds: user.organizationIds.map((id) => id.toString()),
      roles: user.roles.map((r) => ({
        organizationId: r.organizationId.toString(),
        role: r.role,
      })),
      lastLoginAt: user.lastLoginAt,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  }

  private generateTokens(payload: JwtPayload): AuthTokens {
    const accessSecret =
      this.configService.get<string>('JWT_SECRET') || 'super_secret_klyro_jwt_key_dev_mode_only_123456789';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super_secret_klyro_jwt_refresh_key_dev_mode_only_987654321';

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
    });

    return { accessToken, refreshToken };
  }
}
