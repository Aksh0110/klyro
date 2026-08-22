import { Injectable, Logger } from '@nestjs/common';
import { DELIVERY_CHANNELS, DELIVERY_STATUS } from '@klyro/config';
import { INotificationProvider, ProviderDeliveryResult } from './notification-provider.interface';
import { NotificationDocument } from '../schemas/notification.schema';
import { NotificationPreferenceDocument } from '../schemas/notification-preference.schema';

@Injectable()
export class InAppProvider implements INotificationProvider {
  private readonly logger = new Logger(InAppProvider.name);
  readonly channel = DELIVERY_CHANNELS.IN_APP;

  async send(
    notification: NotificationDocument,
    _preference?: NotificationPreferenceDocument | null,
  ): Promise<ProviderDeliveryResult> {
    this.logger.log(`In-App notification delivered to user ${notification.recipientUserId}`);
    return {
      status: DELIVERY_STATUS.DELIVERED,
      providerMessageId: `in_app_${notification._id}`,
    };
  }
}
