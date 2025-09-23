import {
  aFiscalCode,
  aIun,
  aProblem,
  aSignature,
  aSignatureInput,
  aThirdPartyMessage,
  anAssertionRef,
  anAssertionType,
  anOriginalMethod,
  anOriginalUrl,
} from "@/__mocks__/notification.js";
import { SendHeaders, sendHeadersSchema } from "@/adapters/send/definitions.js";
import NotificationClient, {
  NotificationClientError,
} from "@/adapters/send/notification.js";
import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getNotification } from "../aar-notifications.js";

const apiKey = "anApiKey";
const baseUrl = "https://mockurl.com";
const notificationClient = new NotificationClient(apiKey, baseUrl);
const uatNotificationClient = new NotificationClient(apiKey, baseUrl);

const getReceivedNotificationSpy = vi
  .spyOn(notificationClient, "getReceivedNotification")
  .mockImplementation(() => Promise.resolve(aThirdPartyMessage));

const uatGetReceivedNotificationSpy = vi
  .spyOn(uatNotificationClient, "getReceivedNotification")
  .mockImplementation(() => Promise.resolve(aThirdPartyMessage));

const handler = getNotification(notificationClient, uatNotificationClient);

const aLollipopHeaders: SendHeaders = {
  signature: aSignature,
  "signature-input": aSignatureInput,
  "x-pagopa-cx-taxid": aFiscalCode,
  "x-pagopa-lollipop-assertion-ref": anAssertionRef,
  "x-pagopa-lollipop-assertion-type": anAssertionType,
  "x-pagopa-lollipop-auth-jwt": "an auth jwt",
  "x-pagopa-lollipop-original-method": anOriginalMethod,
  "x-pagopa-lollipop-original-url": anOriginalUrl,
  "x-pagopa-lollipop-public-key": "a public key",
  "x-pagopa-lollipop-user-id": aFiscalCode,
};

const context = new InvocationContext();
context.extraInputs = new Map();
vi.spyOn(context, "error").mockImplementation(() => {});

describe("GetAARNotification", () => {
  beforeEach(() => {
    getReceivedNotificationSpy.mockClear();
    uatGetReceivedNotificationSpy.mockClear();
    context.extraInputs.set("lollipopHeaders", aLollipopHeaders);
  });

  it("returns 200 status code if the request is well-formed", async () => {
    const request = new HttpRequest({
      method: "GET",
      params: { iun: aIun },
      url: "http://localhost",
    });
    request.query.set("isTest", "false");

    await expect(handler(request, context)).resolves.toEqual({
      jsonBody: aThirdPartyMessage,
      status: 200,
    });

    const parseHeaders = sendHeadersSchema.parse(aLollipopHeaders);
    expect(getReceivedNotificationSpy).toHaveBeenCalledWith(
      aIun,
      parseHeaders,
      undefined,
    );
    expect(uatGetReceivedNotificationSpy).not.toHaveBeenCalledOnce();

    const mandateId = crypto.randomUUID();
    request.query.set("mandateId", mandateId);
    await expect(handler(request, context)).resolves.toEqual({
      jsonBody: aThirdPartyMessage,
      status: 200,
    });
    expect(getReceivedNotificationSpy).toHaveBeenCalledWith(
      aIun,
      parseHeaders,
      mandateId,
    );
  });

  it("should use uatNotificationClient when isTest=true", async () => {
    const request = new HttpRequest({
      method: "GET",
      params: { iun: aIun },
      url: "http://localhost",
    });
    request.query.set("isTest", "true");

    await expect(handler(request, context)).resolves.toEqual({
      jsonBody: aThirdPartyMessage,
      status: 200,
    });

    const parseHeaders = sendHeadersSchema.parse(aLollipopHeaders);
    expect(getReceivedNotificationSpy).not.toHaveBeenCalledOnce();
    expect(uatGetReceivedNotificationSpy).toHaveBeenCalledWith(
      aIun,
      parseHeaders,
      undefined,
    );
  });

  it("returns 400 status code if the request is malformed", async () => {
    const request = new HttpRequest({
      method: "GET",
      params: { iun: aIun },
      url: "http://localhost",
    });
    request.query.set("mandateId", "badMandateId");
    const result = (await handler(request, context)) as HttpResponseInit;
    expect(result.jsonBody.detail).toBe("Malformed request");
    expect(result.status).toBe(400);

    const malformedLollipopHeaders = {
      signature: aSignature,
      "signature-input": aSignatureInput,
      "x-pagopa-lollipop-assertion-ref": anAssertionRef,
      "x-pagopa-lollipop-assertion-type": anAssertionType,
      "x-pagopa-lollipop-auth-jwt": "an auth jwt",
      "x-pagopa-lollipop-original-method": anOriginalMethod,
      "x-pagopa-lollipop-original-url": anOriginalUrl,
      "x-pagopa-lollipop-public-key": "a public key",
      "x-pagopa-lollipop-user-id": aFiscalCode,
    };
    const mandateId = crypto.randomUUID();
    request.query.set("mandateId", mandateId);

    context.extraInputs.set("lollipopHeaders", malformedLollipopHeaders);
    expect(getReceivedNotificationSpy).not.toHaveBeenCalledOnce();
    expect(uatGetReceivedNotificationSpy).not.toHaveBeenCalledOnce();

    const result2 = (await handler(request, context)) as HttpResponseInit;
    expect(result2.jsonBody.detail).toBe("Malformed request");
    expect(result2.status).toBe(400);

    expect(getReceivedNotificationSpy).not.toHaveBeenCalledOnce();
    expect(uatGetReceivedNotificationSpy).not.toHaveBeenCalledOnce();
  });

  it("returns 500 status code for all the others errors", async () => {
    const getReceivedNotificationSpyNotfClientErr = vi
      .spyOn(notificationClient, "getReceivedNotification")
      .mockImplementation(() =>
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
      params: { iun: aIun },
      url: "http://localhost",
    });

    const result = (await handler(request, context)) as HttpResponseInit;
    expect(result.jsonBody.detail).toBe("Internal server error");
    expect(result.jsonBody.status).toBe(503);
    expect(result.status).toBe(500);
    expect(getReceivedNotificationSpyNotfClientErr).toHaveBeenCalledOnce();
  });
});
