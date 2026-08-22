import { Injectable, Logger } from '@nestjs/common';
import { DELIVERY_CHANNELS, DELIVERY_STATUS } from '@klyro/config';
import { INotificationProvider, ProviderDeliveryResult } from './notification-provider.interface';
import { NotificationDocument } from '../schemas/notification.schema';
import { NotificationPreferenceDocument } from '../schemas/notification-preference.schema';

@Injectable()
export class WhatsAppProviderStub implements INotificationProvider {
  private readonly logger = new Logger(WhatsAppProviderStub.name);
  readonly channel = DELIVERY_CHANNELS.WHATSAPP;

  async send(
    notification: NotificationDocument,
    _preference?: NotificationPreferenceDocument | null,
  ): Promise<ProviderDeliveryResult> {
    this.logger.log(`WhatsApp Provider Stub called for notification ${notification._id}`);
    return {
      status: DELIVERY_STATUS.SENT,
      providerMessageId: `whatsapp_stub_${notification._id}`,
    };
  }
}
