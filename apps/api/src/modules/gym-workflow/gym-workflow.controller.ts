import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { EntitlementGuard } from '../subscription/guards/entitlement.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { GetTenantContext, GetCurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '@klyro/types';
import { PERMISSIONS } from '@klyro/config';
import { GymWorkflowService } from './gym-workflow.service';
import { OnboardMemberDto } from './dto/onboard-member.dto';
import { RenewMemberDto } from './dto/renew-member.dto';
import { CollectMemberPaymentDto } from './dto/collect-member-payment.dto';

@Controller('gym/members')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, EntitlementGuard)
export class GymWorkflowController {

  constructor(private readonly workflowService: GymWorkflowService) {}

  @Get('check-duplicate')
  @RequirePermissions(PERMISSIONS.CUSTOMER_READ)
  async checkDuplicate(
    @GetTenantContext() tenant: TenantContext,
    @Query('phone') phone: string,
  ) {
    return this.workflowService.checkDuplicatePhone(tenant.organizationId, phone);
  }

  @Post('onboard')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.CUSTOMER_CREATE, PERMISSIONS.MEMBERSHIP_CREATE)
  async onboardMember(
    @GetTenantContext() tenant: TenantContext,
    @GetCurrentUser() user: any,
    @Body() dto: OnboardMemberDto,
  ) {
    const recordedByUserId = tenant?.userId || user?.userId || user?._id || user?.id;
    return this.workflowService.onboardMember(tenant.organizationId, dto, recordedByUserId);
  }

  @Post(':customerId/renew')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.MEMBERSHIP_CREATE)
  async renewMembership(
    @Param('customerId') customerId: string,
    @GetTenantContext() tenant: TenantContext,
    @GetCurrentUser() user: any,
    @Body() dto: RenewMemberDto,
  ) {
    const recordedByUserId = tenant?.userId || user?.userId || user?._id || user?.id;
    return this.workflowService.renewMembership(tenant.organizationId, customerId, dto, recordedByUserId);
  }

  @Post(':customerId/collect-payment')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.PAYMENT_CREATE)
  async collectPayment(
    @Param('customerId') customerId: string,
    @GetTenantContext() tenant: TenantContext,
    @GetCurrentUser() user: any,
    @Body() dto: CollectMemberPaymentDto,
  ) {
    const recordedByUserId = tenant?.userId || user?.userId || user?._id || user?.id;
    return this.workflowService.collectMemberPayment(tenant.organizationId, customerId, dto, recordedByUserId);
  }
}
