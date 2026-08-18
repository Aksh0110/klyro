import { DeliveryChannelType, DeliveryStatusType } from '@klyro/config';
import { NotificationDocument } from '../schemas/notification.schema';
import { NotificationPreferenceDocument } from '../schemas/notification-preference.schema';

export interface ProviderDeliveryResult {
  status: DeliveryStatusType;
  providerMessageId?: string;
  errorDetails?: string;
}

export interface INotificationProvider {
  readonly channel: DeliveryChannelType;
  send(
    notification: NotificationDocument,
    preference?: NotificationPreferenceDocument | null,
  ): Promise<ProviderDeliveryResult>;
}
