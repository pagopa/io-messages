import {
  AarQrCodeValue,
  CheckQrMandateResponse,
  NotificationClient,
  SendHeaders,
} from "../notification.js";

export class QrCodeCheckUseCase {
  #getNotificationClient: (isTest: boolean) => NotificationClient;

  constructor(getNotificationClient: (isTest: boolean) => NotificationClient) {
    this.#getNotificationClient = getNotificationClient;
  }

  async execute(
    isTest: boolean,
    sendHeaders: SendHeaders,
    aarQrCodeValue: AarQrCodeValue,
  ): Promise<CheckQrMandateResponse> {
    const notificationClient = this.#getNotificationClient(isTest);

    const response = await notificationClient.checkAarQrCodeIO(
      aarQrCodeValue,
      sendHeaders,
    );
    return response;
  }
}
