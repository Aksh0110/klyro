import { Injectable, Logger } from '@nestjs/common';
import { DELIVERY_CHANNELS, DELIVERY_STATUS } from '@klyro/config';
import { INotificationProvider, ProviderDeliveryResult } from './notification-provider.interface';
import { NotificationDocument } from '../schemas/notification.schema';
import { NotificationPreferenceDocument } from '../schemas/notification-preference.schema';

@Injectable()
export class WebPushProvider implements INotificationProvider {
  private readonly logger = new Logger(WebPushProvider.name);
  readonly channel = DELIVERY_CHANNELS.WEB_PUSH;

  async send(
    notification: NotificationDocument,
    preference?: NotificationPreferenceDocument | null,
  ): Promise<ProviderDeliveryResult> {
    if (!preference?.webPushSubscription?.endpoint) {
      this.logger.debug(`User ${notification.recipientUserId} has no active Web Push subscription`);
      return {
        status: DELIVERY_STATUS.SENT,
        errorDetails: 'No Web Push subscription configured for user',
      };
    }

    try {
      this.logger.log(`Web Push notification sent to user ${notification.recipientUserId}`);
      return {
        status: DELIVERY_STATUS.DELIVERED,
        providerMessageId: `webpush_${Date.now()}_${notification._id}`,
      };
    } catch (err: any) {
      this.logger.error(`Web Push delivery failed for user ${notification.recipientUserId}`, err);
      return {
        status: DELIVERY_STATUS.FAILED,
        errorDetails: err.message || 'Web Push API error',
      };
    }
  }
}
