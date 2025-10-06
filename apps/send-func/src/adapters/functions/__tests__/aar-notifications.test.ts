import {
  aIun,
  aLollipopHeaders,
  aProblem,
  aSendHeaders,
  aThirdPartyMessage,
  anIvalidMandateId,
  createMockNotificationClient,
} from "@/__mocks__/notification.js";
import { NotificationClientError } from "@/adapters/send/notification.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getNotification } from "../aar-notifications.js";

const notificationClient = createMockNotificationClient();
const uatNotificationClient = createMockNotificationClient();

const getNotificationClient = (isTest: boolean) =>
  isTest ? uatNotificationClient : notificationClient;

const handler = getNotification(getNotificationClient);

const context = new InvocationContext();

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

    expect(notificationClient.getReceivedNotification).toHaveBeenCalledWith(
      aIun,
      aSendHeaders,
      undefined,
    );
    expect(
      uatNotificationClient.getReceivedNotification,
    ).not.toHaveBeenCalled();

    const mandateId = crypto.randomUUID();
    request.query.set("mandateId", mandateId);
    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aThirdPartyMessage,
      status: 200,
    });
    expect(notificationClient.getReceivedNotification).toHaveBeenCalledWith(
      aIun,
      aSendHeaders,
      mandateId,
    );
  });

  it("should use uatNotificationClient when isTest=true", async () => {
    const request = new HttpRequest({
      method: "GET",
      params: { iun: aIun },
      query: { isTest: "true" },
      url: "http://localhost",
    });

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aThirdPartyMessage,
      status: 200,
    });

    expect(notificationClient.getReceivedNotification).not.toHaveBeenCalled();
    expect(uatNotificationClient.getReceivedNotification).toHaveBeenCalledWith(
      aIun,
      aSendHeaders,
      undefined,
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
    notificationClient.getReceivedNotification.mockImplementationOnce(() =>
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

    expect(notificationClient.getReceivedNotification).toHaveBeenCalledOnce();
  });
});
