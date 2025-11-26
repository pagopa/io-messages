import {
  aCheckQrMandateResponse,
  aLollipopHeaders,
  aProblem,
  aSendHeaders,
  anAarQrCodeValue,
  anInvalidAarQrCodeValue,
  mockNotificationClient,
} from "@/__mocks__/notification.js";
import { TelemetryEventService } from "@/adapters/appinsights/appinsights.js";
import { NotificationClientError } from "@/adapters/send/notification.js";
import { QrCodeCheckUseCase } from "@/domain/use-cases/qr-code-check.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { beforeEach } from "vitest";
import { describe, expect, it, vi } from "vitest";

import { aarQRCodeCheck } from "../aar-qrcode-check.js";

const trackEventMock = vi.fn(() => Promise.resolve());
const mocks = vi.hoisted(() => ({
  TelemetryClient: vi.fn().mockImplementation(() => ({
    trackEvent: trackEventMock,
  })),
}));

const telemetryClient = new mocks.TelemetryClient();
const telemetryServiceMock = new TelemetryEventService(telemetryClient);
const telemetryTrackEventMock = vi
  .spyOn(telemetryServiceMock, "trackEvent")
  .mockResolvedValue();

const getNotificationClientMock = vi.fn(() => mockNotificationClient);
const qrCodeCheckUseCase = new QrCodeCheckUseCase(getNotificationClientMock);
const handler = aarQRCodeCheck(qrCodeCheckUseCase, telemetryServiceMock);

const context = new InvocationContext();

const anAarBodyString = JSON.stringify({
  aarQrCodeValue: anAarQrCodeValue,
});

const anInvalidAarBodyString = JSON.stringify({
  aarQrCodeValue: anInvalidAarQrCodeValue,
});

const qrCodeCheckExecuteSpy = vi.spyOn(qrCodeCheckUseCase, "execute");

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
    request.headers.set("x-pagopa-pn-io-src", "QR_CODE");

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aCheckQrMandateResponse,
      status: 200,
    });

    expect(qrCodeCheckExecuteSpy).toHaveBeenCalledWith(
      false,
      aSendHeaders,
      anAarQrCodeValue,
    );

    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 status code if the request is malformed", async () => {
    const request = new HttpRequest({
      body: { string: anInvalidAarBodyString },
      method: "POST",
      url: "http://localhost",
    });
    request.headers.set("x-pagopa-pn-io-src", "QR_CODE");

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: {
        detail: `Malformed aar qr code ${anInvalidAarBodyString}`,
        status: 400,
        title: "Bad Request",
      },
      status: 400,
    });

    expect(qrCodeCheckExecuteSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 status code if the x-pagopa-pn-io-src header is not set", async () => {
    const request = new HttpRequest({
      body: { string: anInvalidAarBodyString },
      method: "POST",
      url: "http://localhost",
    });

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: {
        detail: "Missing mandatory x-pagopa-pn-io-src header",
        status: 400,
        title: "Bad Request",
      },
      status: 400,
    });

    expect(qrCodeCheckExecuteSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  it("returns 500 status code for all the others errors", async () => {
    qrCodeCheckExecuteSpy.mockImplementationOnce(() =>
      Promise.reject(
        new NotificationClientError("Notification client error", 503, aProblem),
      ),
    );

    const request = new HttpRequest({
      body: { string: anAarBodyString },
      method: "POST",
      url: "http://localhost",
    });
    request.headers.set("x-pagopa-pn-io-src", "QR_CODE");

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aProblem,
      status: 500,
    });

    expect(qrCodeCheckExecuteSpy).toHaveBeenCalledOnce();
    expect(telemetryTrackEventMock).toHaveBeenCalledOnce();
  });
});
