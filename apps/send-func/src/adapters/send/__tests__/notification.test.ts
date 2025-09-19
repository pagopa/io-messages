import {
  aCheckQrMandateRequest,
  aCheckQrMandateResponse,
  aDocIdx,
  aFiscalCode,
  aIun,
  aProblem,
  aSignature,
  aSignatureInput,
  aThirdPartyMessage,
  anAarQrCodeValue,
  anAssertionRef,
  anAssertionType,
  anAttachmentName,
  anAttchmentMetadataResponse,
  anOriginalMethod,
  anOriginalUrl,
} from "@/__mocks__/notification.js";
import { describe, expect, it, vi } from "vitest";

import { SendHeaders } from "../definitions.js";
import NotificationClient from "../notification.js";

const apiKey = "anApiKey";
const baseUrl = "https://mockurl.com";
const client = new NotificationClient(apiKey, baseUrl);
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

describe("NotificationClient.checkAarQrCodeIO", () => {
  it("returns a valid CheckQrMandateResponse on successful request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aCheckQrMandateResponse,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.checkAarQrCodeIO(
      anAarQrCodeValue,
      aLollipopHeaders,
    );

    expect(response).toEqual(aCheckQrMandateResponse);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/check-qr-code`,
      expect.objectContaining({
        body: JSON.stringify(aCheckQrMandateRequest),
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "POST",
      }),
    );
  });

  it("throws a 403 error with a valid CheckQrMandateResponse in the body when not mandate is found", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aCheckQrMandateResponse,
      ok: false,
      status: 403,
    } as Response);

    await expect(
      client.checkAarQrCodeIO(anAarQrCodeValue, aLollipopHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        body: aCheckQrMandateResponse,
        message: `The api responded with HTTP status 403`,
        status: 403,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/check-qr-code`,
      expect.objectContaining({
        body: JSON.stringify(aCheckQrMandateRequest),
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "POST",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws an error with a Problem when the api return a status different from 403", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aProblem,
      ok: false,
      status: 400,
    } as Response);

    await expect(
      client.checkAarQrCodeIO(anAarQrCodeValue, aLollipopHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        body: aProblem,
        message: `The api responded with HTTP status 400`,
        status: 400,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/check-qr-code`,
      expect.objectContaining({
        body: JSON.stringify(aCheckQrMandateRequest),
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "POST",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should throw a generic error if the fetch or something elese fails", async () => {
    const returnedError = new Error("Network error");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(returnedError);

    await expect(
      client.checkAarQrCodeIO(anAarQrCodeValue, aLollipopHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Error during checkAarQrCodeIO api call | Error: Network error",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/check-qr-code`,
      expect.objectContaining({
        body: JSON.stringify(aCheckQrMandateRequest),
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "POST",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("NotificationClient.getReceivedNotification", () => {
  it("returns a valid ThirdPartyMessage on successful request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aThirdPartyMessage,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.getReceivedNotification(
      aIun,
      aLollipopHeaders,
    );

    expect(response).toEqual(aThirdPartyMessage);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/${aIun}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "GET",
      }),
    );
  });

  it("throws an error with a Problem when the api return a status different from 403", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aProblem,
      ok: false,
      status: 400,
    } as Response);

    await expect(
      client.getReceivedNotification(aIun, aLollipopHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        body: aProblem,
        message: `The api responded with HTTP status 400`,
        status: 400,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/${aIun}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "GET",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should throw a generic error if the fetch or something elese fails", async () => {
    const returnedError = new Error("Network error");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(returnedError);

    await expect(
      client.getReceivedNotification(aIun, aLollipopHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Error during getReceivedNotification api call | Error: Network error",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/${aIun}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "GET",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("NotificationClient.getReceivedNotificationAttachment", () => {
  it("returns a valid AttachamentMetadataResponse on successful request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => anAttchmentMetadataResponse,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.getReceivedNotificationAttachment(
      aIun,
      anAttachmentName,
      aLollipopHeaders,
    );

    expect(response).toEqual(anAttchmentMetadataResponse);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/${aIun}/attachments/payment/${anAttachmentName}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "GET",
      }),
    );
  });

  it("throws an error with a Problem when the api return a status different from 403", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aProblem,
      ok: false,
      status: 400,
    } as Response);

    await expect(
      client.getReceivedNotificationAttachment(
        aIun,
        anAttachmentName,
        aLollipopHeaders,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        body: aProblem,
        message: `The api responded with HTTP status 400`,
        status: 400,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/${aIun}/attachments/payment/${anAttachmentName}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "GET",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should throw a generic error if the fetch or something elese fails", async () => {
    const returnedError = new Error("Network error");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(returnedError);

    await expect(
      client.getReceivedNotificationAttachment(
        aIun,
        anAttachmentName,
        aLollipopHeaders,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Error during getReceivedNotificationAttachment api call | Error: Network error",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/${aIun}/attachments/payment/${anAttachmentName}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "GET",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("NotificationClient.getReceivedNgetReceivedNotificationDocumentotificationAttachment", () => {
  it("returns a valid AttachamentMetadataResponse on successful request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => anAttchmentMetadataResponse,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.getReceivedNotificationDocument(
      aIun,
      aDocIdx,
      aLollipopHeaders,
    );

    expect(response).toEqual(anAttchmentMetadataResponse);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/${aIun}/attachments/documents/${aDocIdx}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "GET",
      }),
    );
  });

  it("throws an error with a Problem when the api return a status different from 403", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aProblem,
      ok: false,
      status: 400,
    } as Response);

    await expect(
      client.getReceivedNotificationDocument(aIun, aDocIdx, aLollipopHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        body: aProblem,
        message: `The api responded with HTTP status 400`,
        status: 400,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/${aIun}/attachments/documents/${aDocIdx}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "GET",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should throw a generic error if the fetch or something elese fails", async () => {
    const returnedError = new Error("Network error");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(returnedError);

    await expect(
      client.getReceivedNotificationDocument(aIun, aDocIdx, aLollipopHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Error during getReceivedNotificationDocument api call | Error: Network error",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/delivery/notifications/received/${aIun}/attachments/documents/${aDocIdx}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
          "x-pagopa-cx-taxid": aFiscalCode,
        }),
        method: "GET",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
