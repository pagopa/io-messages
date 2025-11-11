import {
  CIEValidationData,
  MandateId,
  NotificationClient,
  SendHeaders,
} from "../notification.js";

export class AcceptNotificationMandateUseCase {
  #getNotificationClient: (isTest: boolean) => NotificationClient;

  constructor(getNotificationClient: (isTest: boolean) => NotificationClient) {
    this.#getNotificationClient = getNotificationClient;
  }

  async execute(
    isTest: boolean,
    mandateId: MandateId,
    CIEValidationdata: CIEValidationData,
    sendHeaders: SendHeaders,
  ): Promise<unknown> {
    const notificationClient = this.#getNotificationClient(isTest);

    const response = await notificationClient.acceptNotificationMandate(
      mandateId,
      CIEValidationdata,
      sendHeaders,
    );
    return response;
  }
}
