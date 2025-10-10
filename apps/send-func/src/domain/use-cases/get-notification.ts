import {
  Iun,
  MandateId,
  NotificationClient,
  SendHeaders,
  ThirdPartyMessage,
} from "../notification.js";

export class GetNotificationUseCase {
  #getNotificationClient: (isTest: boolean) => NotificationClient;

  constructor(getNotificationClient: (isTest: boolean) => NotificationClient) {
    this.#getNotificationClient = getNotificationClient;
  }

  async execute(
    isTest: boolean,
    sendHeaders: SendHeaders,
    iun: Iun,
    mandateid?: MandateId,
  ): Promise<ThirdPartyMessage> {
    const notificationClient = this.#getNotificationClient(isTest);

    const response = await notificationClient.getReceivedNotification(
      iun,
      sendHeaders,
      mandateid,
    );
    return response;
  }
}
