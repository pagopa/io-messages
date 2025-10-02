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
import {
  aarGetNotificationResponseSchema,
  sendHeadersSchema,
} from "@/adapters/send/definitions.js";
import NotificationClient, {
  NotificationClientError,
} from "@/adapters/send/notification.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { problemJsonSchema } from "io-messages-common/domain/problem-json";
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

const getSendClientMock = (isTest: boolean) =>
  isTest ? uatNotificationClient : notificationClient;

const handler = getNotification(getSendClientMock);

const aLollipopHeaders: LollipopHeaders = {
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

const sendHeaders = {
  "x-pagopa-cx-taxid": aFiscalCode,
  ...aLollipopHeaders,
};
const parseHeaders = sendHeadersSchema.parse(sendHeaders);

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
    request.headers.set("x-pagopa-cx-taxid", aFiscalCode);

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aThirdPartyMessage,
      status: 200,
    });

    expect(getReceivedNotificationSpy).toHaveBeenCalledWith(
      aIun,
      parseHeaders,
      undefined,
    );
    expect(uatGetReceivedNotificationSpy).not.toHaveBeenCalled();

    const mandateId = crypto.randomUUID();
    request.query.set("mandateId", mandateId);
    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
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
    request.headers.set("x-pagopa-cx-taxid", aFiscalCode);

    await expect(handler(request, context, aLollipopHeaders)).resolves.toEqual({
      jsonBody: aThirdPartyMessage,
      status: 200,
    });

    expect(getReceivedNotificationSpy).not.toHaveBeenCalled();
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
    request.headers.set("x-pagopa-cx-taxid", aFiscalCode);

    const result = aarGetNotificationResponseSchema.parse(
      await handler(request, context, aLollipopHeaders),
    );
    expect(result.status).toBe(400);

    const body = problemJsonSchema.parse(result.jsonBody);
    expect(body.detail).toBe("Malformed request");

    request.headers.set("x-pagopa-cx-taxid", "badFiscalCode");

    const result2 = aarGetNotificationResponseSchema.parse(
      await handler(request, context, aLollipopHeaders),
    );
    expect(result2.status).toBe(400);

    const body2 = problemJsonSchema.parse(result2.jsonBody);
    expect(body2.detail).toBe("Malformed headers");
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
    request.headers.set("x-pagopa-cx-taxid", aFiscalCode);

    const result = aarGetNotificationResponseSchema.parse(
      await handler(request, context, aLollipopHeaders),
    );
    expect(result.status).toBe(500);

    const body = problemJsonSchema.parse(result.jsonBody);
    expect(body.detail).toBe(aProblem.detail);
    expect(body.status).toBe(503);

    expect(getReceivedNotificationSpyNotfClientErr).toHaveBeenCalledOnce();
  });
});
