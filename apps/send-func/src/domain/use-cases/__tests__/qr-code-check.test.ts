import {
  aCheckQrMandateResponse,
  aSendHeaders,
  createMockNotificationClient,
} from "@/__mocks__/notification.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QrCodeCheckUseCase } from "../qr-code-check.js";

const notificationClient = createMockNotificationClient();
const uatNotificationClient = createMockNotificationClient();

const getNotificationClient = (isTest: boolean) =>
  isTest ? uatNotificationClient : notificationClient;

const qrCodeCheckUseCase = new QrCodeCheckUseCase(getNotificationClient);

describe("qrCodeCheckUseCase execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the prod notificationClient checkAarQrCodeIO when isTest is false", async () => {
    await expect(
      qrCodeCheckUseCase.execute(false, aSendHeaders, "some-qr-code-value"),
    ).resolves.toBe(aCheckQrMandateResponse);

    expect(notificationClient.checkAarQrCodeIO).toHaveBeenCalledTimes(1);
    expect(notificationClient.checkAarQrCodeIO).toHaveBeenCalledWith(
      "some-qr-code-value",
      aSendHeaders,
    );
    expect(uatNotificationClient.checkAarQrCodeIO).not.toHaveBeenCalled();
  });

  it("calls the uat notificationClient checkAarQrCodeIO when isTest is false", async () => {
    await expect(
      qrCodeCheckUseCase.execute(true, aSendHeaders, "some-qr-code-value"),
    ).resolves.toBe(aCheckQrMandateResponse);

    expect(uatNotificationClient.checkAarQrCodeIO).toHaveBeenCalledTimes(1);
    expect(uatNotificationClient.checkAarQrCodeIO).toHaveBeenCalledWith(
      "some-qr-code-value",
      aSendHeaders,
    );
    expect(notificationClient.checkAarQrCodeIO).not.toHaveBeenCalled();
  });
});
