import type { Logger } from "@pagopa/hexagonal-core/domain/ports";
import type { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import type { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";

import { FiscalCodeSchema, GenericError } from "@pagopa/hexagonal-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SendHTTPAdapter } from "../send-http.js";

const baseURL = new URL("https://send.example/api///");
const iun = "ABCD-EFGH-IJKL-123456-Z-7";
const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const authentication: RCAuthenticationConfig = {
  headerKeyName: "x-api-key",
  key: "send-api-key",
  type: "API_KEY",
};
const lollipopHeaders: LollipopHeaders = {
  signature: "sig1=:YWJjZA==:",
  "signature-input":
    'sig1=("x-pagopa-lollipop-original-method" "x-pagopa-lollipop-original-url")',
  "x-pagopa-lollipop-assertion-ref":
    "sha256-6LvipIvFuhyorHpUqK3HjySC5Y6gshXHFBhU9EJ4DoM=",
  "x-pagopa-lollipop-assertion-type": "OIDC",
  "x-pagopa-lollipop-auth-jwt": "a-bearer-token",
  "x-pagopa-lollipop-original-method": "GET",
  "x-pagopa-lollipop-original-url":
    "https://api.io.pagopa.it/api/v1/messages/message-id",
  "x-pagopa-lollipop-public-key": "a-public-key",
  "x-pagopa-lollipop-user-id": FiscalCodeSchema.parse("RMLGNN97R06F158N"),
};

const validResponse = {
  attachments: [
    {
      category: null,
      content_type: "application/pdf",
      id: "notification-document",
      name: "Notification",
      url: `/delivery/notifications/received/${iun}/attachments/documents/0`,
    },
  ],
  details: {
    iun,
    notificationStatusHistory: [
      {
        activeFrom: "2026-10-02T10:00:00+02:00",
        relatedTimelineElements: ["timeline-element"],
        status: "DELIVERED",
      },
    ],
    recipients: [
      {
        denomination: "Mario Rossi",
        recipientType: "PF",
        taxId: fiscalCode,
      },
    ],
    subject: "Notification subject",
  },
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

const fetchMock = vi.fn<typeof fetch>();
const trackEventMock = vi.fn();
const adapter = new SendHTTPAdapter({
  trackEvent: trackEventMock,
} as unknown as Logger);

const getRequest = (): Request => {
  const request = fetchMock.mock.calls[0]?.[0];

  expect(request).toBeInstanceOf(Request);
  return request as Request;
};

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(validResponse));
  trackEventMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("SendHTTPAdapter - successful responses", () => {
  it("returns a valid SEND notification and sends all configured headers", async () => {
    const result = await adapter.getNotification(
      baseURL,
      authentication,
      iun,
      fiscalCode,
      lollipopHeaders,
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      ...validResponse,
      attachments: [
        {
          ...validResponse.attachments[0],
          category: "DOCUMENT",
        },
      ],
    });

    const request = getRequest();
    expect(request.url).toBe(
      `https://send.example/api/delivery/notifications/received/${iun}`,
    );
    expect(request.redirect).toBe("manual");
    expect(request.headers.get("x-pagopa-cx-taxid")).toBe(fiscalCode);
    expect(request.headers.get(authentication.headerKeyName)).toBe(
      authentication.key,
    );
    expect(request.headers.get("signature")).toBe(lollipopHeaders.signature);
    expect(request.headers.get("x-pagopa-lollipop-user-id")).toBe(
      lollipopHeaders["x-pagopa-lollipop-user-id"],
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("sends the fiscal code without Lollipop headers when they are not provided", async () => {
    const result = await adapter.getNotification(
      baseURL,
      authentication,
      iun,
      fiscalCode,
    );

    expect(result.isOk()).toBe(true);

    const request = getRequest();
    expect(request.headers.get("x-pagopa-cx-taxid")).toBe(fiscalCode);
    expect(request.headers.has("signature")).toBe(false);
    expect(request.headers.has("x-pagopa-lollipop-user-id")).toBe(false);
  });
});

describe("SendHTTPAdapter - response validation", () => {
  it("returns a GenericError when a successful response does not match the SEND schema", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ attachments: "invalid" }));

    const result = await adapter.getNotification(
      baseURL,
      authentication,
      iun,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: Invalid response shape from SEND service.",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});

describe("SendHTTPAdapter - HTTP error responses", () => {
  it.each([400, 500, 503])(
    "maps status %s to GenericError and tracks the failure",
    async (status) => {
      fetchMock.mockResolvedValue(jsonResponse({}, status));

      const result = await adapter.getNotification(
        baseURL,
        authentication,
        iun,
        fiscalCode,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
      expect(result._unsafeUnwrapErr().message).toBe(
        `Generic error: Failed to fetch PN ReceivedNotification: ${status}`,
      );
      expect(trackEventMock).toHaveBeenCalledExactlyOnceWith({
        name: "SendHTTPAdapter.getNotification.failed",
        properties: {
          baseURL: baseURL.toString(),
          iun,
        },
      });
    },
  );
});

describe("SendHTTPAdapter - response-less errors", () => {
  it.each([
    ["string errors", "network error", "network error"],
    ["Error instances", new Error("network error"), "network error"],
    [
      "serializable errors",
      { reason: "network error" },
      '{"reason":"network error"}',
    ],
  ])(
    "returns a GenericError for response-less %s",
    async (_description, fetchError, expectedMessage) => {
      fetchMock.mockRejectedValue(fetchError);

      const result = await adapter.getNotification(
        baseURL,
        authentication,
        iun,
        fiscalCode,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
      expect(result._unsafeUnwrapErr().message).toBe(
        `Generic error: ${expectedMessage}`,
      );
      expect(trackEventMock).not.toHaveBeenCalled();
    },
  );

  it("returns a GenericError for an unreadable response-less error", async () => {
    const circularError: { self?: unknown } = {};
    circularError.self = circularError;
    fetchMock.mockRejectedValue(circularError);

    const result = await adapter.getNotification(
      baseURL,
      authentication,
      iun,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: unreadable response body",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});
