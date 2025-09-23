import {
  aCheckQrMandateResponse,
  aFiscalCode,
  anAarQrCodeValue,
  anAssertionRef,
  anAssertionType,
  anOriginalMethod,
  anOriginalUrl,
  aProblem,
  aSignature,
  aSignatureInput,
} from "@/__mocks__/notification.js";
import NotificationClient, {
  NotificationClientError,
} from "@/adapters/send/notification.js";
import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aarQRCodeCheck } from "../aar-qrcode-check.js";
import { SendHeaders, sendHeadersSchema } from "@/adapters/send/definitions.js";

const apiKey = "anApiKey";
const baseUrl = "https://mockurl.com";
const notificationClient = new NotificationClient(apiKey, baseUrl);
const uatNotificationClient = new NotificationClient(apiKey, baseUrl);

let checkAarQrCodeIOSpy = vi
  .spyOn(notificationClient, "checkAarQrCodeIO")
  .mockImplementation(() => Promise.resolve(aCheckQrMandateResponse));

let uatCheckAarQrCodeIOSpy = vi
  .spyOn(uatNotificationClient, "checkAarQrCodeIO")
  .mockImplementation(() => Promise.resolve(aCheckQrMandateResponse));

const handler = aarQRCodeCheck(notificationClient, uatNotificationClient);

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

describe("AARQrCodeCheck", () => {
  afterEach(() => {
    checkAarQrCodeIOSpy.mockClear();
    uatCheckAarQrCodeIOSpy.mockClear();
  });

  it("returns 200 status code if the request is well-formed", async () => {
    const request = new HttpRequest({
      method: "POST",
      url: "http://localhost",
    });
    request.query.set("isTest", "false");
    const requestBodyJson = vi
      .spyOn(request, "json")
      .mockResolvedValue({ aarQrCodeValue: anAarQrCodeValue });

    const context = new InvocationContext();
    context.extraInputs = new Map();
    context.extraInputs.set("lollipopHeaders", aLollipopHeaders);

    await expect(handler(request, context)).resolves.toEqual({
      jsonBody: aCheckQrMandateResponse,
      status: 200,
    });
    expect(requestBodyJson).toHaveBeenCalledOnce();

    const parseHeaders = sendHeadersSchema.parse(aLollipopHeaders);
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
    const requestBodyJson = vi
      .spyOn(request, "json")
      .mockResolvedValue({ aarQrCodeValue: anAarQrCodeValue });

    const context = new InvocationContext();
    context.extraInputs = new Map();
    context.extraInputs.set("lollipopHeaders", aLollipopHeaders);
    context.error = vi.fn();

    await expect(handler(request, context)).resolves.toEqual({
      jsonBody: aCheckQrMandateResponse,
      status: 200,
    });
    expect(requestBodyJson).toHaveBeenCalledOnce();

    const parseHeaders = sendHeadersSchema.parse(aLollipopHeaders);
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
    const requestBodyJson = vi
      .spyOn(request, "json")
      .mockResolvedValue({ aarQrCodeValueBadProp: anAarQrCodeValue });

    const context = new InvocationContext();
    context.extraInputs = new Map();
    context.extraInputs.set("lollipopHeaders", aLollipopHeaders);
    context.error = vi.fn();

    const result = (await handler(request, context)) as HttpResponseInit;
    expect(result.jsonBody.detail).toBe("Malformed request");
    expect(result.status).toBe(400);
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
    const requestBodyJson = vi
      .spyOn(request, "json")
      .mockResolvedValue({ aarQrCodeValue: anAarQrCodeValue });

    const context = new InvocationContext();
    context.extraInputs = new Map();
    context.extraInputs.set("lollipopHeaders", aLollipopHeaders);
    context.error = vi.fn();

    const result = (await handler(request, context)) as HttpResponseInit;
    expect(result.jsonBody.detail).toBe("Internal server error");
    expect(result.jsonBody.status).toBe(503);
    expect(result.status).toBe(500);
    expect(checkAarQrCodeIOSpyNotfClientErr).toHaveBeenCalledOnce();
  });
});
