import {
  aCheckQrMandateRequest,
  aCheckQrMandateResponse,
  aDocIdx,
  aFiscalCode,
  aIun,
  aMandateCreationResponse,
  aProblem,
  aSendHeaders,
  aThirdPartyMessage,
  anAarQrCodeValue,
  anAttachmentMetadata,
  anAttachmentName,
  anAuthErrorResponse,
} from "@/__mocks__/notification.js";
import { describe, expect, it, vi } from "vitest";

import NotificationClient from "../notification.js";

const apiKey = "anApiKey";
const baseUrl = "https://mockurl.com";
const client = new NotificationClient(apiKey, baseUrl);

describe("NotificationClient.checkAarQrCodeIO", () => {
  it("returns a valid CheckQrMandateResponse on successful request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aCheckQrMandateResponse,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.checkAarQrCodeIO(
      anAarQrCodeValue,
      aSendHeaders,
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
      client.checkAarQrCodeIO(anAarQrCodeValue, aSendHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        body: aCheckQrMandateResponse,
        message: `The api responded with HTTP status 403`,
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
      client.checkAarQrCodeIO(anAarQrCodeValue, aSendHeaders),
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
      client.checkAarQrCodeIO(anAarQrCodeValue, aSendHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Network error",
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

    const response = await client.getReceivedNotification(aIun, aSendHeaders);

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
      client.getReceivedNotification(aIun, aSendHeaders),
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
      client.getReceivedNotification(aIun, aSendHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Network error",
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
      json: async () => anAttachmentMetadata,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.getReceivedNotificationAttachment(
      aIun,
      anAttachmentName,
      aSendHeaders,
    );

    expect(response).toEqual(anAttachmentMetadata);
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
        aSendHeaders,
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
        aSendHeaders,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Network error",
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
      json: async () => anAttachmentMetadata,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.getReceivedNotificationDocument(
      aIun,
      aDocIdx,
      aSendHeaders,
    );

    expect(response).toEqual(anAttachmentMetadata);
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
      client.getReceivedNotificationDocument(aIun, aDocIdx, aSendHeaders),
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
      client.getReceivedNotificationDocument(aIun, aDocIdx, aSendHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Network error",
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

describe("NotificationClient.createNotificationMandate", () => {
  it("returns a valid MandateCreationResponse on successful request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aMandateCreationResponse,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.createNotificationMandate(
      anAarQrCodeValue,
      aSendHeaders,
    );

    expect(response).toEqual(aMandateCreationResponse);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/mandate/api/v1/io/mandate`,
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

  it("can throw a 401 error with an AuthError in the body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => anAuthErrorResponse,
      ok: false,
      status: 401,
    } as Response);

    await expect(
      client.createNotificationMandate(anAarQrCodeValue, aSendHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        message: anAuthErrorResponse.message,
        name: "NotificationClientAuthError",
        status: 401,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/mandate/api/v1/io/mandate`,
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

    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("can throw a 403 error with an AuthError in the body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => anAuthErrorResponse,
      ok: false,
      status: 403,
    } as Response);

    await expect(
      client.createNotificationMandate(anAarQrCodeValue, aSendHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        message: anAuthErrorResponse.message,
        name: "NotificationClientAuthError",
        status: 403,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/mandate/api/v1/io/mandate`,
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

    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("throws an error with a Problem when the api return a status different from 403 and 401", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aProblem,
      ok: false,
      status: 422,
    } as Response);

    await expect(
      client.createNotificationMandate(anAarQrCodeValue, aSendHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        body: aProblem,
        message: `The api responded with HTTP status 422`,
        status: 422,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/mandate/api/v1/io/mandate`,
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

    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("should throw a generic error if the fetch or something elese fails", async () => {
    const returnedError = new Error("Network error");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(returnedError);

    await expect(
      client.createNotificationMandate(anAarQrCodeValue, aSendHeaders),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Network error",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/mandate/api/v1/io/mandate`,
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

    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
