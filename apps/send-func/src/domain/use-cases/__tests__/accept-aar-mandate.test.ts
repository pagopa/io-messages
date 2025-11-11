import {
  aCIEValidationdata,
  aSendHeaders,
  createMockNotificationClient,
} from "@/__mocks__/notification.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcceptNotificationMandateUseCase } from "../accept-notification-mandate.js";

const notificationClient = createMockNotificationClient();
const uatNotificationClient = createMockNotificationClient();

const getNotificationClient = (isTest: boolean) =>
  isTest ? uatNotificationClient : notificationClient;

const acceptNotificationMandateUseCase = new AcceptNotificationMandateUseCase(
  getNotificationClient,
);

describe("acceptNotificationMandateUseCase execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the prod notificationClient acceptNotificationMandate when isTest is false", async () => {
    await expect(
      acceptNotificationMandateUseCase.execute(
        false,
        "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        aCIEValidationdata,
        aSendHeaders,
      ),
    ).resolves.toBeUndefined();

    expect(notificationClient.acceptNotificationMandate).toHaveBeenCalledOnce();
    expect(notificationClient.acceptNotificationMandate).toHaveBeenCalledWith(
      "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      aCIEValidationdata,
      aSendHeaders,
    );
    expect(
      uatNotificationClient.acceptNotificationMandate,
    ).not.toHaveBeenCalled();
  });

  it("calls the uat notificationClient acceptNotificationMandate when isTest is false", async () => {
    await expect(
      acceptNotificationMandateUseCase.execute(
        true,
        "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        aCIEValidationdata,
        aSendHeaders,
      ),
    ).resolves.toBeUndefined();

    expect(
      uatNotificationClient.acceptNotificationMandate,
    ).toHaveBeenCalledOnce();
    expect(
      uatNotificationClient.acceptNotificationMandate,
    ).toHaveBeenCalledWith(
      "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      aCIEValidationdata,
      aSendHeaders,
    );
    expect(notificationClient.acceptNotificationMandate).not.toHaveBeenCalled();
  });
});
