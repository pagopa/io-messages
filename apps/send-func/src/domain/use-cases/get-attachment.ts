import z from "zod";

import {
  AttachmentMetadata,
  MandateId,
  NotificationClient,
  SendHeaders,
  attachmentNameSchema,
  idxSchema,
  iunSchema,
} from "../notification.js";

export const attachmentParamsSchema = z.discriminatedUnion("type", [
  z.object({
    attachmentIdx: idxSchema.optional(),
    attachmentName: attachmentNameSchema,
    iun: iunSchema,
    type: z.literal("payment"),
  }),
  z.object({
    docIdx: idxSchema,
    iun: iunSchema,
    type: z.literal("document"),
  }),
]);
export type AttachmentParams = z.TypeOf<typeof attachmentParamsSchema>;

export class GetAttachmentUseCase {
  #getNotificationClient: (isTest: boolean) => NotificationClient;

  constructor(getNotificationClient: (isTest: boolean) => NotificationClient) {
    this.#getNotificationClient = getNotificationClient;
  }

  async execute(
    attachmentParams: AttachmentParams,
    sendHeaders: SendHeaders,
    isTest: boolean,
    mandateId?: MandateId,
  ): Promise<AttachmentMetadata> {
    const notificationClient = this.#getNotificationClient(isTest);
    if (attachmentParams.type === "payment") {
      const response =
        await notificationClient.getReceivedNotificationAttachment(
          attachmentParams.iun,
          attachmentParams.attachmentName,
          sendHeaders,
          {
            attachmentIdx: attachmentParams.attachmentIdx,
            mandateId: mandateId,
          },
        );

      return response;
    } else {
      const response = await notificationClient.getReceivedNotificationDocument(
        attachmentParams.iun,
        attachmentParams.docIdx,
        sendHeaders,
        mandateId,
      );

      return response;
    }
  }
}
