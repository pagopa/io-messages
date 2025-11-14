import {
  aAuthError,
  aCreateNotificationMandateResponse,
  aLollipopHeaders,
  aProblem,
  aSendHeaders,
  anAarQrCodeValue,
  anInvalidAarQrCodeValue,
  mockNotificationClient,
} from "@/__mocks__/notification.js";
import { TelemetryEventService } from "@/adapters/appinsights/appinsights.js";
import {
  NotificationCLientAuthError,
  NotificationClientError,
} from "@/adapters/send/notification.js";
import { CreateNotificationMandateUseCase } from "@/domain/use-cases/create-notification-mandate.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { beforeEach } from "vitest";
import { describe, expect, it, vi } from "vitest";

import { createNotificationMandate } from "../aar-notification-mandate.js";
import {
  sendAuthErrorToAARProblemJson,
  sendProblemToAARProblemJson,
} from "../commons/response.js";

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
const createNotificationMandateUseCase = new CreateNotificationMandateUseCase(
  getNotificationClientMock,
);
const handler = createNotificationMandate(
  createNotificationMandateUseCase,
  telemetryServiceMock,
);

const context = new InvocationContext();

const anAarBodyString = JSON.stringify({
  aarQrCodeValue: anAarQrCodeValue,
});

const anInvalidAarBodyString = JSON.stringify({
  aarQrCodeValue: anInvalidAarQrCodeValue,
});

const createNotificationMandateExecuteSpy = vi.spyOn(
  createNotificationMandateUseCase,
  "execute",
);

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
      jsonBody: aCreateNotificationMandateResponse,
      status: 200,
    });

    expect(createNotificationMandateExecuteSpy).toHaveBeenCalledWith(
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

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: {
        detail: `Malformed aar qr code ${anInvalidAarBodyString}`,
        status: 400,
        title: "Bad Request",
      },
      status: 400,
    });

    expect(createNotificationMandateExecuteSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  it("returns 500 status code for all the others errors", async () => {
    createNotificationMandateExecuteSpy.mockImplementationOnce(() =>
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
      jsonBody: sendProblemToAARProblemJson(aProblem),
      status: 500,
    });

    expect(createNotificationMandateExecuteSpy).toHaveBeenCalledOnce();
    expect(telemetryTrackEventMock).toHaveBeenCalledOnce();
  });

  it("returns 500 status specifying inner status code returned by SEND", async () => {
    const aProblemsArray = [
      { ...aProblem, status: 400 },
      { ...aProblem, status: 409 },
      { ...aProblem, status: 500 },
    ];
    for (const aProblemItem of aProblemsArray) {
      createNotificationMandateExecuteSpy.mockImplementationOnce(() =>
        Promise.reject(
          new NotificationClientError(
            "Notification client error",
            aProblemItem.status,
            aProblemItem,
          ),
        ),
      );

      const request = new HttpRequest({
        body: { string: anAarBodyString },
        method: "POST",
        url: "http://localhost",
      });

      await expect(
        handler(request, context, aLollipopHeaders),
      ).resolves.toEqual({
        jsonBody: sendProblemToAARProblemJson(aProblemItem),
        status: 500,
      });

      expect(createNotificationMandateExecuteSpy).toHaveBeenCalledOnce();
      expect(telemetryTrackEventMock).toHaveBeenCalledOnce();
      vi.clearAllMocks();
    }
  });

  it("returns the proper status code on auth error", async () => {
    const aAuthErrorsStatusCodesArray = [{ status: 401 }, { status: 403 }];

    for (const aAuthErrorItem of aAuthErrorsStatusCodesArray) {
      const clientAuthError = new NotificationCLientAuthError(
        aAuthError.message,
        aAuthErrorItem.status,
      );
      createNotificationMandateExecuteSpy.mockImplementationOnce(() =>
        Promise.reject(clientAuthError),
      );

      const request = new HttpRequest({
        body: { string: anAarBodyString },
        method: "POST",
        url: "http://localhost",
      });

      await expect(
        handler(request, context, aLollipopHeaders),
      ).resolves.toEqual({
        jsonBody: sendAuthErrorToAARProblemJson(
          clientAuthError,
          aAuthErrorItem.status,
        ),
        status: aAuthErrorItem.status,
      });

      expect(createNotificationMandateExecuteSpy).toHaveBeenCalledOnce();
      vi.clearAllMocks();
    }
  });
});
