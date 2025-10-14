import {
  aCheckQrMandateResponse,
  aIun,
  aSendHeaders,
  aThirdPartyMessage,
  createMockNotificationClient,
} from "@/__mocks__/notification.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GetNotificationUseCase } from "../get-notification.js";

const notificationClient = createMockNotificationClient();
const uatNotificationClient = createMockNotificationClient();

const getNotificationClient = (isTest: boolean) =>
  isTest ? uatNotificationClient : notificationClient;

const getNotificationUseCase = new GetNotificationUseCase(
  getNotificationClient,
);

const aMandateId = "some-mandate-id";

describe("getNotificationUseCase execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the prod notificationClient getReceivedNotification when isTest is false", async () => {
    await expect(
      getNotificationUseCase.execute(false, aSendHeaders, aIun, aMandateId),
    ).resolves.toBe(aThirdPartyMessage);

    expect(notificationClient.getReceivedNotification).toHaveBeenCalledTimes(1);
    expect(notificationClient.getReceivedNotification).toHaveBeenCalledWith(
      aIun,
      aSendHeaders,
      aMandateId,
    );
    expect(
      uatNotificationClient.getReceivedNotification,
    ).not.toHaveBeenCalled();
  });

  it("calls the uat notificationClient getReceivedNotification when isTest is false", async () => {
    await expect(
      getNotificationUseCase.execute(true, aSendHeaders, aIun, aMandateId),
    ).resolves.toBe(aThirdPartyMessage);

    expect(uatNotificationClient.getReceivedNotification).toHaveBeenCalledTimes(
      1,
    );
    expect(uatNotificationClient.getReceivedNotification).toHaveBeenCalledWith(
      aIun,
      aSendHeaders,
      aMandateId,
    );
    expect(notificationClient.getReceivedNotification).not.toHaveBeenCalled();
  });
});
