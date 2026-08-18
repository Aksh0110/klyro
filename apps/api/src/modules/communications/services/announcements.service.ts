import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Announcement, AnnouncementDocument } from '../schemas/announcement.schema';
import { AudienceResolverService } from './audience-resolver.service';
import { NotificationService } from './notification.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from '@klyro/validation';
import {
  AUDIENCE_TYPES,
  ANNOUNCEMENT_STATUS,
  NOTIFICATION_TYPES,
} from '@klyro/config';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectModel(Announcement.name) private announcementModel: Model<AnnouncementDocument>,
    private readonly audienceResolver: AudienceResolverService,
    private readonly notificationService: NotificationService,
  ) {}

  async createAnnouncement(user: any, organizationId: string, dto: CreateAnnouncementDto): Promise<AnnouncementDocument> {
    const orgObjId = new Types.ObjectId(organizationId);
    const userObjId = new Types.ObjectId(user._id || user.id);

    if (dto.audienceType === AUDIENCE_TYPES.BRANCH_MEMBERS && !dto.branchId) {
      throw new BadRequestException('Branch ID is required when audience is BRANCH_MEMBERS');
    }

    const scheduledDate = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    const isFutureSchedule = scheduledDate && scheduledDate.getTime() > Date.now();

    const announcement = new this.announcementModel({
      organizationId: orgObjId,
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : undefined,
      createdBy: userObjId,
      title: dto.title,
      body: dto.body,
      audienceType: dto.audienceType,
      status: isFutureSchedule ? ANNOUNCEMENT_STATUS.SCHEDULED : ANNOUNCEMENT_STATUS.DRAFT,
      channels: dto.channels || ['IN_APP', 'WEB_PUSH'],
      scheduledAt: scheduledDate,
    });

    return announcement.save();
  }

  async publishAnnouncement(id: string, user: any, organizationId: string): Promise<AnnouncementDocument> {
    const orgObjId = new Types.ObjectId(organizationId);
    const announcement = await this.announcementModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId: orgObjId,
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (announcement.status === ANNOUNCEMENT_STATUS.PUBLISHED) {
      return announcement;
    }

    // Resolve audience members
    const recipients = await this.audienceResolver.resolveAudience(
      organizationId,
      announcement.audienceType,
      announcement.branchId?.toString(),
    );

    // Dispatch notifications for all eligible recipients
    await Promise.all(
      recipients.map(async (r) => {
        try {
          await this.notificationService.createNotification({
            organizationId: announcement.organizationId,
            recipientUserId: r.userId,
            customerId: r.customerId,
            type: NOTIFICATION_TYPES.ANNOUNCEMENT,
            title: announcement.title,
            body: announcement.body,
            announcementId: announcement._id,
            channels: announcement.channels,
            eventKey: `announcement:${announcement._id}:${r.userId}`,
          });
        } catch (err) {
          this.logger.error(`Failed notification dispatch for recipient ${r.userId}`, err);
        }
      }),
    );

    announcement.status = ANNOUNCEMENT_STATUS.PUBLISHED;
    announcement.publishedAt = new Date();
    return announcement.save();
  }

  async cancelAnnouncement(id: string, user: any, organizationId: string): Promise<AnnouncementDocument> {
    const orgObjId = new Types.ObjectId(organizationId);
    const announcement = await this.announcementModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId: orgObjId,
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (announcement.status === ANNOUNCEMENT_STATUS.PUBLISHED) {
      throw new BadRequestException('Cannot cancel a published announcement');
    }

    announcement.status = ANNOUNCEMENT_STATUS.CANCELLED;
    return announcement.save();
  }

  async updateAnnouncement(id: string, organizationId: string, dto: UpdateAnnouncementDto): Promise<AnnouncementDocument> {
    const orgObjId = new Types.ObjectId(organizationId);
    const announcement = await this.announcementModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId: orgObjId,
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (announcement.status === ANNOUNCEMENT_STATUS.PUBLISHED) {
      throw new BadRequestException('Published announcements cannot be edited');
    }

    if (dto.title) announcement.title = dto.title;
    if (dto.body) announcement.body = dto.body;
    if (dto.audienceType) announcement.audienceType = dto.audienceType as any;
    if (dto.branchId) announcement.branchId = new Types.ObjectId(dto.branchId);
    if (dto.scheduledAt) {
      announcement.scheduledAt = new Date(dto.scheduledAt);
      announcement.status = ANNOUNCEMENT_STATUS.SCHEDULED;
    }

    return announcement.save();
  }

  async getAnnouncements(organizationId: string, branchId?: string): Promise<AnnouncementDocument[]> {
    const query: any = { organizationId: new Types.ObjectId(organizationId) };
    if (branchId) {
      query.$or = [{ branchId: new Types.ObjectId(branchId) }, { branchId: { $exists: false } }];
    }
    return this.announcementModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async getAnnouncementById(id: string, organizationId: string): Promise<AnnouncementDocument> {
    const announcement = await this.announcementModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return announcement;
  }

  async processScheduledAnnouncements(organizationId?: string): Promise<number> {
    const now = new Date();
    const query: any = {
      status: ANNOUNCEMENT_STATUS.SCHEDULED,
      scheduledAt: { $lte: now },
    };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }
    const pendingScheduled = await this.announcementModel.find(query);

    let count = 0;
    for (const ann of pendingScheduled) {
      try {
        await this.publishAnnouncement(ann._id.toString(), { id: ann.createdBy }, ann.organizationId.toString());
        count++;
      } catch (err) {
        this.logger.error(`Failed to publish scheduled announcement ${ann._id}`, err);
      }
    }
    return count;
  }
}
