import {
  aLollipopHeaders,
  aPaymentAttachmentParams,
  aProblem,
  aSendHeaders,
  anAttachmentMetadata,
  anAttachmentUrl,
  anIvalidMandateId,
  mockNotificationClient,
} from "@/__mocks__/notification.js";
import { NotificationClientError } from "@/adapters/send/notification.js";
import { GetAttachmentUseCase } from "@/domain/use-cases/get-attachment.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAttachment } from "../aar-attachments.js";
import { TelemetryEventService } from "@/adapters/appinsights/appinsights.js";

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

const getAttachmentUseCase = new GetAttachmentUseCase(
  getNotificationClientMock,
);

const getAttachmentHandler = getAttachment(
  getAttachmentUseCase,
  telemetryServiceMock,
);

const context = new InvocationContext();

function encodeToUrlEncodedBase64(input: string): string {
  const base64 = Buffer.from(input, "utf8").toString("base64");
  const urlEncodedBase64 = encodeURIComponent(base64);
  return urlEncodedBase64;
}

const anInvalidAttachmentUrl = "anInvalidAttachmentUrl";

const anEncodedAttachmentUrl = encodeToUrlEncodedBase64(anAttachmentUrl);
const anEncodedInvalidAttachmentUrl = encodeToUrlEncodedBase64(
  anInvalidAttachmentUrl,
);

const executeSpy = vi.spyOn(getAttachmentUseCase, "execute");

describe("GetAttachment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 status code if the request is well-formed", async () => {
    const request = new HttpRequest({
      method: "GET",
      params: { attachmentUrl: anEncodedAttachmentUrl },
      url: "http://localhost",
    });

    await expect(
      getAttachmentHandler(request, context, aLollipopHeaders),
    ).resolves.toEqual({
      jsonBody: anAttachmentMetadata,
      status: 200,
    });

    expect(executeSpy).toHaveBeenCalledWith(
      aPaymentAttachmentParams,
      aSendHeaders,
      false,
      undefined,
    );

    const mandateId = crypto.randomUUID();
    request.query.set("mandateId", mandateId);
    await expect(
      getAttachmentHandler(request, context, aLollipopHeaders),
    ).resolves.toEqual({
      jsonBody: anAttachmentMetadata,
      status: 200,
    });
    expect(executeSpy).toHaveBeenCalledWith(
      aPaymentAttachmentParams,
      aSendHeaders,
      false,
      mandateId,
    );

    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 status code if the request is malformed", async () => {
    const request = new HttpRequest({
      method: "GET",
      params: { attachmentUrl: anEncodedAttachmentUrl },
      query: { mandateId: anIvalidMandateId },
      url: "http://localhost",
    });

    await expect(
      getAttachmentHandler(request, context, aLollipopHeaders),
    ).resolves.toEqual({
      jsonBody: {
        detail: `Malformed mandateId ${anIvalidMandateId}`,
        status: 400,
        title: "Bad Request",
      },
      status: 400,
    });

    const request2 = new HttpRequest({
      method: "GET",
      params: { attachmentUrl: anEncodedInvalidAttachmentUrl },
      url: "http://localhost",
    });

    await expect(
      getAttachmentHandler(request2, context, aLollipopHeaders),
    ).resolves.toEqual({
      jsonBody: {
        detail: `Malformed attachmentUrl ${anInvalidAttachmentUrl}`,
        status: 400,
        title: "Bad Request",
      },
      status: 400,
    });

    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  it("returns 500 status code for all the others errors", async () => {
    mockNotificationClient.getReceivedNotificationAttachment.mockImplementationOnce(
      () =>
        Promise.reject(
          new NotificationClientError(
            "Notification client error",
            503,
            aProblem,
          ),
        ),
    );

    const request = new HttpRequest({
      method: "GET",
      params: { attachmentUrl: anEncodedAttachmentUrl },
      url: "http://localhost",
    });

    await expect(
      getAttachmentHandler(request, context, aLollipopHeaders),
    ).resolves.toEqual({
      jsonBody: aProblem,
      status: 500,
    });

    expect(
      mockNotificationClient.getReceivedNotificationAttachment,
    ).toHaveBeenCalledOnce();

    expect(telemetryTrackEventMock).toHaveBeenCalledOnce();
  });
});
