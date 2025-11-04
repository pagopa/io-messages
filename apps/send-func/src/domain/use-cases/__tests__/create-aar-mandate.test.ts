import {
  aMandateCreationResponse,
  aSendHeaders,
  createMockNotificationClient,
} from "@/__mocks__/notification.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateNotificationMandateUseCase } from "../create-notification-mandate.js";

const notificationClient = createMockNotificationClient();
const uatNotificationClient = createMockNotificationClient();

const getNotificationClient = (isTest: boolean) =>
  isTest ? uatNotificationClient : notificationClient;

const createAARMandateUseCase = new CreateNotificationMandateUseCase(
  getNotificationClient,
);

describe("CreateNotificationMandateUseCase execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the prod notificationClient createNotificationMandate when isTest is false", async () => {
    await expect(
      createAARMandateUseCase.execute(
        false,
        aSendHeaders,
        "some-qr-code-value",
      ),
    ).resolves.toBe(aMandateCreationResponse);

    expect(notificationClient.createNotificationMandate).toHaveBeenCalledOnce();
    expect(notificationClient.createNotificationMandate).toHaveBeenCalledWith(
      "some-qr-code-value",
      aSendHeaders,
    );
    expect(
      uatNotificationClient.createNotificationMandate,
    ).not.toHaveBeenCalled();
  });

  it("calls the uat notificationClient createNotificationMandate when isTest is false", async () => {
    await expect(
      createAARMandateUseCase.execute(true, aSendHeaders, "some-qr-code-value"),
    ).resolves.toBe(aMandateCreationResponse);

    expect(
      uatNotificationClient.createNotificationMandate,
    ).toHaveBeenCalledOnce();
    expect(
      uatNotificationClient.createNotificationMandate,
    ).toHaveBeenCalledWith("some-qr-code-value", aSendHeaders);
    expect(notificationClient.createNotificationMandate).not.toHaveBeenCalled();
  });
});
