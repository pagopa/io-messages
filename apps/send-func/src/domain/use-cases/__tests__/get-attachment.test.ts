import {
  aDocIdx,
  aDocumentAttachmentParams,
  aPaymentAttachmentParams,
  aSendHeaders,
  anAttachmentMetadata,
  anAttachmentName,
  anAttachmnetIdx,
} from "@/__mocks__/notification.js";
import {
  AttachmentMetadata,
  NotificationClient,
} from "@/domain/notification.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GetAttachmentUseCase } from "../get-attachment.js";

const createMockNotificationClient = (
  attachmentResponse: AttachmentMetadata,
): NotificationClient => ({
  checkAarQrCodeIO: vi.fn(),
  getReceivedNotification: vi.fn(),
  getReceivedNotificationAttachment: vi
    .fn()
    .mockImplementation(() => Promise.resolve(attachmentResponse)),
  getReceivedNotificationDocument: vi
    .fn()
    .mockImplementation(() => Promise.resolve(attachmentResponse)),
});

const notificationClient = createMockNotificationClient(anAttachmentMetadata);
const uatNotificationClient =
  createMockNotificationClient(anAttachmentMetadata);

const getNotificationClient = (isTest: boolean) =>
  isTest ? uatNotificationClient : notificationClient;

const getAttachmentUseCase = new GetAttachmentUseCase(getNotificationClient);

describe("ingestMessageStatusUseCase execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testCases: {
    client: NotificationClient;
    expectedArgs: unknown[];
    expectedMethod: keyof NotificationClient;
    isTest: boolean;
    name: string;
    params: typeof aDocumentAttachmentParams | typeof aPaymentAttachmentParams;
  }[] = [
    {
      client: notificationClient,
      expectedArgs: [
        aPaymentAttachmentParams.iun,
        anAttachmentName,
        aSendHeaders,
        { attachmentIdx: anAttachmnetIdx },
      ],
      expectedMethod: "getReceivedNotificationAttachment",
      isTest: false,
      name: "calls the prod notificationClient getReceivedNotificationAttachment when it receives a payment param type",
      params: aPaymentAttachmentParams,
    },
    {
      client: notificationClient,
      expectedArgs: [
        aDocumentAttachmentParams.iun,
        aDocIdx,
        aSendHeaders,
        undefined,
      ],
      expectedMethod: "getReceivedNotificationDocument",
      isTest: false,
      name: "calls the prod notificationClient getReceivedNotificationDocument when it receives a document param type",
      params: aDocumentAttachmentParams,
    },
    {
      client: uatNotificationClient,
      expectedArgs: [
        aPaymentAttachmentParams.iun,
        anAttachmentName,
        aSendHeaders,
        { attachmentIdx: anAttachmnetIdx },
      ],
      expectedMethod: "getReceivedNotificationAttachment",
      isTest: true,
      name: "calls the uat notificationClient getReceivedNotificationAttachment when it receives a payment param type",
      params: aPaymentAttachmentParams,
    },
    {
      client: uatNotificationClient,
      expectedArgs: [
        aDocumentAttachmentParams.iun,
        aDocIdx,
        aSendHeaders,
        undefined,
      ],
      expectedMethod: "getReceivedNotificationDocument",
      isTest: true,
      name: "calls the uat notificationClient getReceivedNotificationDocument when it receives a document param type",
      params: aDocumentAttachmentParams,
    },
  ];

  it.each(testCases)(
    "$name",
    async ({ client, expectedArgs, expectedMethod, isTest, params }) => {
      await expect(
        getAttachmentUseCase.execute(params, aSendHeaders, isTest),
      ).resolves.toBe(anAttachmentMetadata);

      expect(client[expectedMethod]).toHaveBeenCalledTimes(1);
      expect(client[expectedMethod]).toHaveBeenCalledWith(...expectedArgs);
    },
  );
});
