import {
  aCheckQrMandateResponse,
  aLollipopHeaders,
  aProblem,
  aSendHeaders,
  anAarQrCodeValue,
  anInvalidAarQrCodeValue,
  createMockNotificationClient,
} from "@/__mocks__/notification.js";
import { NotificationClientError } from "@/adapters/send/notification.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { beforeEach } from "vitest";
import { describe, expect, it, vi } from "vitest";

import { aarQRCodeCheck } from "../aar-qrcode-check.js";

const notificationClient = createMockNotificationClient();
const uatNotificationClient = createMockNotificationClient();

const getNotificationClient = (isTest: boolean) =>
  isTest ? uatNotificationClient : notificationClient;

const handler = aarQRCodeCheck(getNotificationClient);

const context = new InvocationContext();

const anAarBodyString = JSON.stringify({
  aarQrCodeValue: anAarQrCodeValue,
});

const anInvalidAarBodyString = JSON.stringify({
  aarQrCodeValue: anInvalidAarQrCodeValue,
});

describe("AARQrCodeCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 status code if the request is well-formed", async () => {
    const request = new HttpRequest({
      body: { string: anAarBodyString },
      method: "POST",
      url: "http://localhost",
    });

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aCheckQrMandateResponse,
      status: 200,
    });

    expect(notificationClient.checkAarQrCodeIO).toHaveBeenCalledWith(
      anAarQrCodeValue,
      aSendHeaders,
    );
    expect(uatNotificationClient.checkAarQrCodeIO).not.toHaveBeenCalled();
  });

  it("should use uatNotificationClient when isTest=true", async () => {
    const request = new HttpRequest({
      body: { string: anAarBodyString },
      method: "POST",
      query: { isTest: "true" },
      url: "http://localhost",
    });

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aCheckQrMandateResponse,
      status: 200,
    });

    expect(notificationClient.checkAarQrCodeIO).not.toHaveBeenCalled();
    expect(uatNotificationClient.checkAarQrCodeIO).toHaveBeenCalledWith(
      anAarQrCodeValue,
      aSendHeaders,
    );
  });

  it("returns 400 status code if the request is malformed", async () => {
    const request = new HttpRequest({
      body: { string: anInvalidAarBodyString },
      method: "POST",
      url: "http://localhost",
    });

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: {
        detail: `Malformed aar qr code ${anInvalidAarBodyString}`,
        status: 400,
        title: "Bad Request",
      },
      status: 400,
    });

    expect(notificationClient.checkAarQrCodeIO).not.toHaveBeenCalled();
    expect(uatNotificationClient.checkAarQrCodeIO).not.toHaveBeenCalled();
  });

  it("returns 500 status code for all the others errors", async () => {
    notificationClient.checkAarQrCodeIO.mockImplementationOnce(() =>
      Promise.reject(
        new NotificationClientError("Notification client error", 503, aProblem),
      ),
    );

    const request = new HttpRequest({
      body: { string: anAarBodyString },
      method: "POST",
      url: "http://localhost",
    });

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aProblem,
      status: 500,
    });

    expect(notificationClient.checkAarQrCodeIO).toHaveBeenCalledOnce();
  });
});
