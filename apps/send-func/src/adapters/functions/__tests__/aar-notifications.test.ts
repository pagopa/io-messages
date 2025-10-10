import {
  aIun,
  aLollipopHeaders,
  aProblem,
  aSendHeaders,
  aThirdPartyMessage,
  anIvalidMandateId,
  mockNotificationClient,
} from "@/__mocks__/notification.js";
import { NotificationClientError } from "@/adapters/send/notification.js";
import { GetNotificationUseCase } from "@/domain/use-cases/get-notification.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getNotification } from "../aar-notifications.js";

const getNotificationClientMock = vi.fn(() => mockNotificationClient);
const getNotificationUseCase = new GetNotificationUseCase(
  getNotificationClientMock,
);
const handler = getNotification(getNotificationUseCase);

const context = new InvocationContext();

const getNotifiationExecuteSpy = vi.spyOn(getNotificationUseCase, "execute");

describe("GetAARNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 status code if the request is well-formed", async () => {
    const request = new HttpRequest({
      method: "GET",
      params: { iun: aIun },
      url: "http://localhost",
    });

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aThirdPartyMessage,
      status: 200,
    });

    expect(getNotifiationExecuteSpy).toHaveBeenCalledWith(
      false,
      aSendHeaders,
      aIun,
      undefined,
    );

    const mandateId = crypto.randomUUID();
    request.query.set("mandateId", mandateId);
    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aThirdPartyMessage,
      status: 200,
    });
    expect(getNotifiationExecuteSpy).toHaveBeenCalledWith(
      false,
      aSendHeaders,
      aIun,
      mandateId,
    );
  });

  it("returns 400 status code if the request is malformed", async () => {
    const request = new HttpRequest({
      method: "GET",
      params: { iun: aIun },
      query: { mandateId: anIvalidMandateId },
      url: "http://localhost",
    });

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: {
        detail: `Malformed mandateId ${anIvalidMandateId}`,
        status: 400,
        title: "Bad Request",
      },
      status: 400,
    });
  });

  it("returns 500 status code for all the others errors", async () => {
    getNotifiationExecuteSpy.mockImplementationOnce(() =>
      Promise.reject(
        new NotificationClientError("Notification client error", 503, aProblem),
      ),
    );

    const request = new HttpRequest({
      method: "GET",
      params: { iun: aIun },
      url: "http://localhost",
    });

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aProblem,
      status: 500,
    });

    expect(getNotifiationExecuteSpy).toHaveBeenCalledOnce();
  });
});
