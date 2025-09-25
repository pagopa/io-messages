import {
  aCheckQrMandateResponse,
  aFiscalCode,
  aProblem,
  aSignature,
  aSignatureInput,
  anAarQrCodeValue,
  anAssertionRef,
  anAssertionType,
  anOriginalMethod,
  anOriginalUrl,
} from "@/__mocks__/notification.js";
import { sendHeadersSchema } from "@/adapters/send/definitions.js";
import NotificationClient, {
  NotificationClientError,
} from "@/adapters/send/notification.js";
import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { beforeEach } from "vitest";
import { describe, expect, it, vi } from "vitest";

import { aarQRCodeCheck } from "../aar-qrcode-check.js";

const apiKey = "anApiKey";
const baseUrl = "https://mockurl.com";
const notificationClient = new NotificationClient(apiKey, baseUrl);
const uatNotificationClient = new NotificationClient(apiKey, baseUrl);

const checkAarQrCodeIOSpy = vi
  .spyOn(notificationClient, "checkAarQrCodeIO")
  .mockImplementation(() => Promise.resolve(aCheckQrMandateResponse));

const uatCheckAarQrCodeIOSpy = vi
  .spyOn(uatNotificationClient, "checkAarQrCodeIO")
  .mockImplementation(() => Promise.resolve(aCheckQrMandateResponse));

const handler = aarQRCodeCheck(notificationClient, uatNotificationClient);

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

const context = new InvocationContext();
context.extraInputs = new Map();
vi.spyOn(context, "error").mockImplementation(() => {});

describe("AARQrCodeCheck", () => {
  beforeEach(() => {
    checkAarQrCodeIOSpy.mockClear();
    uatCheckAarQrCodeIOSpy.mockClear();
    context.extraInputs.set("lollipopHeaders", aLollipopHeaders);
  });

  it("returns 200 status code if the request is well-formed", async () => {
    const request = new HttpRequest({
      method: "POST",
      url: "http://localhost",
    });
    request.query.set("isTest", "false");
    request.headers.set("x-pagopa-cx-taxid", aFiscalCode);

    const requestBodyJson = vi
      .spyOn(request, "json")
      .mockResolvedValue({ aarQrCodeValue: anAarQrCodeValue });

    await expect(handler(request, context)).resolves.toEqual({
      jsonBody: aCheckQrMandateResponse,
      status: 200,
    });
    expect(requestBodyJson).toHaveBeenCalledOnce();

    const parseHeaders = sendHeadersSchema.parse(sendHeaders);
    expect(checkAarQrCodeIOSpy).toHaveBeenCalledWith(
      anAarQrCodeValue,
      parseHeaders,
    );
    expect(uatCheckAarQrCodeIOSpy).not.toHaveBeenCalledOnce();
  });

  it("should use uatNotificationClient when isTest=true", async () => {
    const request = new HttpRequest({
      method: "POST",
      url: "http://localhost",
    });
    request.query.set("isTest", "true");
    request.headers.set("x-pagopa-cx-taxid", aFiscalCode);

    const requestBodyJson = vi
      .spyOn(request, "json")
      .mockResolvedValue({ aarQrCodeValue: anAarQrCodeValue });

    await expect(handler(request, context)).resolves.toEqual({
      jsonBody: aCheckQrMandateResponse,
      status: 200,
    });
    expect(requestBodyJson).toHaveBeenCalledOnce();

    const parseHeaders = sendHeadersSchema.parse(sendHeaders);
    expect(checkAarQrCodeIOSpy).not.toHaveBeenCalledOnce();
    expect(uatCheckAarQrCodeIOSpy).toHaveBeenCalledWith(
      anAarQrCodeValue,
      parseHeaders,
    );
  });

  it("returns 400 status code if the request is malformed", async () => {
    const request = new HttpRequest({
      method: "POST",
      url: "http://localhost",
    });
    request.query.set("isTest", "false");
    request.headers.set("x-pagopa-cx-taxid", aFiscalCode);

    const requestBodyJson = vi
      .spyOn(request, "json")
      .mockResolvedValue({ aarQrCodeValueBadProp: anAarQrCodeValue });

    const result = (await handler(request, context)) as HttpResponseInit;
    expect(result.jsonBody.detail).toBe("Malformed body");
    expect(result.status).toBe(400);
    expect(requestBodyJson).toHaveBeenCalledOnce();
    expect(checkAarQrCodeIOSpy).not.toHaveBeenCalled();
    expect(uatCheckAarQrCodeIOSpy).not.toHaveBeenCalled();
  });

  it("returns 400 status code if the request headers are malformed", async () => {
    const request = new HttpRequest({
      method: "POST",
      url: "http://localhost",
    });
    request.query.set("isTest", "false");
    request.headers.set("x-pagopa-cx-taxid", aFiscalCode);

    const requestBodyJson = vi
      .spyOn(request, "json")
      .mockResolvedValue({ aarQrCodeValue: anAarQrCodeValue });

    const malformedLollipopHeaders = {
      signature: aSignature,
      "signature-input": aSignatureInput,
      "x-pagopa-lollipop-assertion-ref": anAssertionRef,
      "x-pagopa-lollipop-assertion-type": anAssertionType,
      "x-pagopa-lollipop-auth-jwt": "an auth jwt",
      "x-pagopa-lollipop-original-method": anOriginalMethod,
      "x-pagopa-lollipop-original-url": anOriginalUrl,
    };

    context.extraInputs.set("lollipopHeaders", malformedLollipopHeaders);

    const result = (await handler(request, context)) as HttpResponseInit;
    expect(result.jsonBody.detail).toBe("Malformed headers");
    expect(result.status).toBe(400);
    expect(requestBodyJson).not.toHaveBeenCalledOnce();
    expect(checkAarQrCodeIOSpy).not.toHaveBeenCalled();
    expect(uatCheckAarQrCodeIOSpy).not.toHaveBeenCalled();
  });

  it("returns 500 status code for all the others errors", async () => {
    const checkAarQrCodeIOSpyNotfClientErr = vi
      .spyOn(notificationClient, "checkAarQrCodeIO")
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
      method: "POST",
      url: "http://localhost",
    });
    request.query.set("isTest", "false");
    request.headers.set("x-pagopa-cx-taxid", aFiscalCode);

    const requestBodyJson = vi
      .spyOn(request, "json")
      .mockResolvedValue({ aarQrCodeValue: anAarQrCodeValue });

    const result = (await handler(request, context)) as HttpResponseInit;
    expect(result.jsonBody.detail).toBe("Internal server error");
    expect(result.jsonBody.status).toBe(503);
    expect(result.status).toBe(500);
    expect(requestBodyJson).toHaveBeenCalledOnce();
    expect(checkAarQrCodeIOSpyNotfClientErr).toHaveBeenCalledOnce();
  });
});
