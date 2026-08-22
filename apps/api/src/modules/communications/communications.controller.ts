import {
  Controller,
  Get,
  Post,
  Patch,
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
import { GetCurrentUser as CurrentUser, GetTenantContext as TenantContextDecorator } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '@klyro/types';
import { PERMISSIONS } from '@klyro/config';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  UpdateNotificationPreferenceDto,
  SavePushSubscriptionDto,
} from '@klyro/validation';
import { AnnouncementsService } from './services/announcements.service';
import { NotificationService } from './services/notification.service';
import { RetentionInsightService } from './services/retention-insight.service';
import { AutomatedTriggersService } from './services/automated-triggers.service';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, EntitlementGuard)
export class CommunicationsController {

  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly notificationService: NotificationService,
    private readonly retentionInsightService: RetentionInsightService,
    private readonly automatedTriggersService: AutomatedTriggersService,
  ) {}

  // --- ANNOUNCEMENT ENDPOINTS ---
  @Post('announcements')
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENT_CREATE)
  async createAnnouncement(
    @CurrentUser() user: any,
    @TenantContextDecorator() tenant: TenantContext,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.createAnnouncement(user, tenant.organizationId, dto);
  }

  @Get('announcements')
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENT_READ)
  async getAnnouncements(
    @TenantContextDecorator() tenant: TenantContext,
    @Query('branchId') branchId?: string,
  ) {
    return this.announcementsService.getAnnouncements(tenant.organizationId, branchId);
  }

  @Get('announcements/:id')
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENT_READ)
  async getAnnouncementById(
    @Param('id') id: string,
    @TenantContextDecorator() tenant: TenantContext,
  ) {
    return this.announcementsService.getAnnouncementById(id, tenant.organizationId);
  }

  @Patch('announcements/:id')
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENT_UPDATE)
  async updateAnnouncement(
    @Param('id') id: string,
    @TenantContextDecorator() tenant: TenantContext,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.updateAnnouncement(id, tenant.organizationId, dto);
  }

  @Post('announcements/:id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENT_PUBLISH)
  async publishAnnouncement(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @TenantContextDecorator() tenant: TenantContext,
  ) {
    return this.announcementsService.publishAnnouncement(id, user, tenant.organizationId);
  }

  @Post('announcements/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENT_CANCEL)
  async cancelAnnouncement(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @TenantContextDecorator() tenant: TenantContext,
  ) {
    return this.announcementsService.cancelAnnouncement(id, user, tenant.organizationId);
  }

  // --- NOTIFICATION ENDPOINTS ---
  @Get('notifications')
  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  async getMyNotifications(
    @CurrentUser() user: any,
    @TenantContextDecorator() tenant: TenantContext,
  ) {
    const userId = user.userId || user._id || user.id;
    return this.notificationService.getMyNotifications(userId, tenant.organizationId);
  }

  @Get('notifications/unread-count')
  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  async getUnreadCount(
    @CurrentUser() user: any,
    @TenantContextDecorator() tenant: TenantContext,
  ) {
    const userId = user.userId || user._id || user.id;
    const count = await this.notificationService.getUnreadCount(userId, tenant.organizationId);
    return { unreadCount: count };
  }

  @Patch('notifications/:id/read')
  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @TenantContextDecorator() tenant: TenantContext,
  ) {
    const userId = user.userId || user._id || user.id;
    return this.notificationService.markAsRead(id, userId, tenant.organizationId);
  }

  @Get('notifications/preferences')
  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  async getPreferences(
    @CurrentUser() user: any,
    @TenantContextDecorator() tenant: TenantContext,
  ) {
    const userId = user.userId || user._id || user.id;
    return this.notificationService.getOrCreatePreference(userId, tenant.organizationId as any);
  }

  @Post('notifications/preferences')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  async updatePreferences(
    @CurrentUser() user: any,
    @TenantContextDecorator() tenant: TenantContext,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    const userId = user.userId || user._id || user.id;
    return this.notificationService.updatePreferences(userId, tenant.organizationId, dto);
  }

  @Post('notifications/push-subscription')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
  async savePushSubscription(
    @CurrentUser() user: any,
    @TenantContextDecorator() tenant: TenantContext,
    @Body() dto: SavePushSubscriptionDto,
  ) {
    const userId = user.userId || user._id || user.id;
    return this.notificationService.savePushSubscription(userId, tenant.organizationId, dto);
  }

  // --- RETENTION & AUTOMATION ENDPOINTS ---
  @Get('communications/retention-summary')
  @RequirePermissions(PERMISSIONS.ANNOUNCEMENT_READ)
  async getRetentionSummary(
    @TenantContextDecorator() tenant: TenantContext,
    @Query('branchId') branchId?: string,
  ) {
    return this.retentionInsightService.getRetentionSummary(tenant.organizationId, branchId);
  }

  @Post('communications/run-triggers')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.NOTIFICATION_RUN_TRIGGERS)
  async runAutomatedTriggers(
    @TenantContextDecorator() tenant: TenantContext,
  ) {
    const scheduledPublished = await this.announcementsService.processScheduledAnnouncements(tenant.organizationId);
    const triggerResult = await this.automatedTriggersService.processAutomatedTriggers(tenant.organizationId);
    return {
      scheduledPublished,
      ...triggerResult,
    };
  }
}
