import {
  AarQrCodeValue,
  MandateCreationResponse,
  NotificationClient,
  SendHeaders,
} from "../notification.js";

export class CreateNotificationMandateUseCase {
  #getNotificationClient: (isTest: boolean) => NotificationClient;

  constructor(getNotificationClient: (isTest: boolean) => NotificationClient) {
    this.#getNotificationClient = getNotificationClient;
  }

  async execute(
    isTest: boolean,
    sendHeaders: SendHeaders,
    aarQrCodeValue: AarQrCodeValue,
  ): Promise<MandateCreationResponse> {
    const notificationClient = this.#getNotificationClient(isTest);

    const response = await notificationClient.createNotificationMandate(
      aarQrCodeValue,
      sendHeaders,
    );
    return response;
  }
}
