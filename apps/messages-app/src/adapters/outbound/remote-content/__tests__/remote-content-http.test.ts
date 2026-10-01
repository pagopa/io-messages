import type { Logger } from "@pagopa/hexagonal-core/domain/ports";
import type { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import type { RCAuthenticationConfig } from "io-messages-common/domain/remote-content";

import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RemoteContentServiceUnavailableError } from "../../../../application/ports/remote-content-message-attachment.js";
import { RemoteContentHTTPAdapter } from "../remote-content-http.js";

const baseURL = new URL("https://remote-content.example/api///");
const messageID = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const attachmentURL =
  "delivery/notifications/received/message-id/attachments/payment/document.pdf?attachmentIdx=0";
const attachmentContent = "%PDF-1.7 attachment content";
const fiscalCode = fiscalCodeSchema.parse("RSSMRA80A01H501U");
const authentication: RCAuthenticationConfig = {
  headerKeyName: "x-provider-api-key",
  key: "provider-api-key",
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
  "x-pagopa-lollipop-user-id": fiscalCodeSchema.parse("RMLGNN97R06F158N"),
};

const validResponse = {
  attachments: [
    {
      category: null,
      content_type: "application/pdf",
      id: "attachment-id",
      name: "document.pdf",
      url: "https://remote-content.example/attachments/attachment-id",
    },
  ],
  details: {
    markdown: "A valid remote content message.",
    subject: "A valid subject",
  },
};

const validPreconditionResponse = {
  markdown: "A".repeat(80),
  title: "A valid precondition title",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

const attachmentResponse = (
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(attachmentContent, {
    headers: {
      "Content-Type": "application/octet-stream",
      ...headers,
    },
    status,
  });

const fetchMock = vi.fn<typeof fetch>();
const trackEventMock = vi.fn();
const adapter = new RemoteContentHTTPAdapter({
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

describe("RemoteContentHTTPAdapter - successful responses", () => {
  it("returns a valid Remote Content message and sends all configured headers", async () => {
    const result = await adapter.getRemoteContentMessage(
      baseURL,
      authentication,
      messageID,
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
      `https://remote-content.example/api/messages/${messageID}`,
    );
    expect(request.redirect).toBe("manual");
    expect(request.headers.get("fiscal_code")).toBe(fiscalCode);
    expect(request.headers.get(authentication.headerKeyName)).toBe(
      authentication.key,
    );
    expect(request.headers.get("signature")).toBe(lollipopHeaders.signature);
    expect(request.headers.get("x-pagopa-lollipop-user-id")).toBe(
      lollipopHeaders["x-pagopa-lollipop-user-id"],
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});

describe("RemoteContentHTTPAdapter - request and response validation", () => {
  it("sends the fiscal code without Lollipop headers when they are not provided", async () => {
    const result = await adapter.getRemoteContentMessage(
      baseURL,
      authentication,
      messageID,
      fiscalCode,
    );

    expect(result.isOk()).toBe(true);

    const request = getRequest();
    expect(request.headers.get("fiscal_code")).toBe(fiscalCode);
    expect(request.headers.has("signature")).toBe(false);
    expect(request.headers.has("x-pagopa-lollipop-user-id")).toBe(false);
  });

  it("returns a GenericError when a successful response does not match the domain schema", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ attachments: "invalid" }));

    const result = await adapter.getRemoteContentMessage(
      baseURL,
      authentication,
      messageID,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: Invalid response shape from the Remote Content service.",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});

describe("RemoteContentHTTPAdapter - HTTP error responses", () => {
  it.each([
    {
      errorType: ValidationError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessage.failed.badRequest",
      status: 400,
    },
    {
      errorType: GenericError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessage.failed.unauthorized",
      status: 401,
    },
    {
      errorType: ForbiddenError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessage.failed.forbidden",
      status: 403,
    },
    {
      errorType: NotFoundError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessage.failed.notFound",
      status: 404,
    },
    {
      errorType: TooManyRequestsError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessage.failed.tooManyRequests",
      status: 429,
    },
  ])(
    "maps status $status to $errorType.name and tracks the failure",
    async ({ errorType, eventName, status }) => {
      fetchMock.mockResolvedValue(jsonResponse({}, status));

      const result = await adapter.getRemoteContentMessage(
        baseURL,
        authentication,
        messageID,
        fiscalCode,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(errorType);
      expect(trackEventMock).toHaveBeenCalledExactlyOnceWith({
        name: eventName,
        properties: {
          baseURL: baseURL.toString(),
          messageID,
        },
      });
    },
  );

  it("returns a GenericError on a 500 response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));

    const result = await adapter.getRemoteContentMessage(
      baseURL,
      authentication,
      messageID,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: The Remote Content service returned HTTP status 500.",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("returns a GenericError on an unexpected response status", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 418));

    const result = await adapter.getRemoteContentMessage(
      baseURL,
      authentication,
      messageID,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: The Remote Content service returned an unexpected HTTP status.",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});

describe("RemoteContentHTTPAdapter - response-less errors", () => {
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

      const result = await adapter.getRemoteContentMessage(
        baseURL,
        authentication,
        messageID,
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

    const result = await adapter.getRemoteContentMessage(
      baseURL,
      authentication,
      messageID,
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

describe("RemoteContentHTTPAdapter - successful precondition responses", () => {
  it("returns a valid precondition and sends all configured headers", async () => {
    fetchMock.mockResolvedValue(jsonResponse(validPreconditionResponse));

    const result = await adapter.getRemoteContentMessagePrecondition(
      baseURL,
      authentication,
      messageID,
      fiscalCode,
      lollipopHeaders,
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(validPreconditionResponse);

    const request = getRequest();
    expect(request.url).toBe(
      `https://remote-content.example/api/messages/${messageID}/precondition`,
    );
    expect(request.redirect).toBe("manual");
    expect(request.headers.get("fiscal_code")).toBe(fiscalCode);
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
    const emptyPreconditionResponse = {
      markdown: "",
      title: "",
    };
    fetchMock.mockResolvedValue(jsonResponse(emptyPreconditionResponse));

    const result = await adapter.getRemoteContentMessagePrecondition(
      baseURL,
      authentication,
      messageID,
      fiscalCode,
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(emptyPreconditionResponse);

    const request = getRequest();
    expect(request.headers.get("fiscal_code")).toBe(fiscalCode);
    expect(request.headers.has("signature")).toBe(false);
    expect(request.headers.has("x-pagopa-lollipop-user-id")).toBe(false);
  });
});

describe("RemoteContentHTTPAdapter - precondition response validation", () => {
  it.each([
    [{ markdown: validPreconditionResponse.markdown }],
    [{ ...validPreconditionResponse, title: 42 }],
  ])(
    "returns a GenericError when a successful response does not match the domain schema",
    async (response) => {
      fetchMock.mockResolvedValue(jsonResponse(response));

      const result = await adapter.getRemoteContentMessagePrecondition(
        baseURL,
        authentication,
        messageID,
        fiscalCode,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
      expect(result._unsafeUnwrapErr().message).toBe(
        "Generic error: Invalid precondition response shape from the Remote Content service.",
      );
      expect(trackEventMock).not.toHaveBeenCalled();
    },
  );
});

describe("RemoteContentHTTPAdapter - precondition HTTP error responses", () => {
  it.each([
    {
      errorType: ValidationError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessagePrecondition.failed.badRequest",
      status: 400,
    },
    {
      errorType: GenericError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessagePrecondition.failed.unauthorized",
      status: 401,
    },
    {
      errorType: ForbiddenError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessagePrecondition.failed.forbidden",
      status: 403,
    },
    {
      errorType: NotFoundError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessagePrecondition.failed.notFound",
      status: 404,
    },
    {
      errorType: TooManyRequestsError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessagePrecondition.failed.tooManyRequests",
      status: 429,
    },
  ])(
    "maps precondition status $status to $errorType.name and tracks the failure",
    async ({ errorType, eventName, status }) => {
      fetchMock.mockResolvedValue(jsonResponse({}, status));

      const result = await adapter.getRemoteContentMessagePrecondition(
        baseURL,
        authentication,
        messageID,
        fiscalCode,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(errorType);
      expect(trackEventMock).toHaveBeenCalledExactlyOnceWith({
        name: eventName,
        properties: {
          baseURL: baseURL.toString(),
          messageID,
        },
      });
    },
  );

  it("returns a GenericError on a precondition 500 response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));

    const result = await adapter.getRemoteContentMessagePrecondition(
      baseURL,
      authentication,
      messageID,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: The Remote Content service returned HTTP status 500.",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("returns a GenericError on an unexpected precondition response status", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 418));

    const result = await adapter.getRemoteContentMessagePrecondition(
      baseURL,
      authentication,
      messageID,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: The Remote Content service returned an unexpected HTTP status.",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});

describe("RemoteContentHTTPAdapter - response-less precondition errors", () => {
  it("returns a GenericError when the precondition request has no response", async () => {
    fetchMock.mockRejectedValue("network error");

    const result = await adapter.getRemoteContentMessagePrecondition(
      baseURL,
      authentication,
      messageID,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: network error",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});

describe("RemoteContentHTTPAdapter - successful attachment responses", () => {
  it("returns a Buffer and preserves the attachment path and configured headers", async () => {
    fetchMock.mockResolvedValue(attachmentResponse());

    const result = await adapter.getRemoteContentMessageAttachment(
      baseURL,
      authentication,
      messageID,
      attachmentURL,
      fiscalCode,
      lollipopHeaders,
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(Buffer.from(attachmentContent));

    const request = getRequest();
    expect(request.url).toBe(
      `https://remote-content.example/api/messages/${messageID}/${attachmentURL}`,
    );
    expect(request.redirect).toBe("manual");
    expect(request.headers.get("fiscal_code")).toBe(fiscalCode);
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
    fetchMock.mockResolvedValue(attachmentResponse());
    const attachmentURLWithLeadingSlash = "/documents/attachment.pdf";

    const result = await adapter.getRemoteContentMessageAttachment(
      baseURL,
      authentication,
      messageID,
      attachmentURLWithLeadingSlash,
      fiscalCode,
    );

    expect(result.isOk()).toBe(true);

    const request = getRequest();
    expect(request.url).toBe(
      `https://remote-content.example/api/messages/${messageID}//documents/attachment.pdf`,
    );
    expect(request.headers.get("fiscal_code")).toBe(fiscalCode);
    expect(request.headers.has("signature")).toBe(false);
    expect(request.headers.has("x-pagopa-lollipop-user-id")).toBe(false);
  });
});

describe("RemoteContentHTTPAdapter - attachment response validation", () => {
  it("returns a GenericError when Hey API cannot parse a successful response", async () => {
    const response = attachmentResponse();
    vi.spyOn(response, "arrayBuffer").mockRejectedValue(
      new Error("invalid array buffer"),
    );
    fetchMock.mockResolvedValue(response);

    const result = await adapter.getRemoteContentMessageAttachment(
      baseURL,
      authentication,
      messageID,
      attachmentURL,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: Invalid attachment response from the Remote Content service.",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});

describe("RemoteContentHTTPAdapter - attachment HTTP error responses", () => {
  it.each([
    {
      errorType: ValidationError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessageAttachment.failed.badRequest",
      status: 400,
    },
    {
      errorType: GenericError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessageAttachment.failed.unauthorized",
      status: 401,
    },
    {
      errorType: ForbiddenError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessageAttachment.failed.forbidden",
      status: 403,
    },
    {
      errorType: NotFoundError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessageAttachment.failed.notFound",
      status: 404,
    },
    {
      errorType: TooManyRequestsError,
      eventName:
        "RemoteContentHTTPAdapter.getRemoteContentMessageAttachment.failed.tooManyRequests",
      status: 429,
    },
  ])(
    "maps attachment status $status to $errorType.name and tracks the failure",
    async ({ errorType, eventName, status }) => {
      fetchMock.mockResolvedValue(jsonResponse({}, status));

      const result = await adapter.getRemoteContentMessageAttachment(
        baseURL,
        authentication,
        messageID,
        attachmentURL,
        fiscalCode,
      );

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(errorType);
      expect(trackEventMock).toHaveBeenCalledExactlyOnceWith({
        name: eventName,
        properties: {
          attachmentURL,
          baseURL: baseURL.toString(),
          messageID,
        },
      });
    },
  );

  it("returns a GenericError on an attachment 500 response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));

    const result = await adapter.getRemoteContentMessageAttachment(
      baseURL,
      authentication,
      messageID,
      attachmentURL,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: The Remote Content service returned HTTP status 500.",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it.each([
    ["120", "120"],
    [undefined, undefined],
  ])(
    "returns a ServiceUnavailableError with Retry-After %s on a 503 response",
    async (retryAfterHeader, expectedRetryAfter) => {
      fetchMock.mockResolvedValue(
        attachmentResponse(
          503,
          retryAfterHeader ? { "Retry-After": retryAfterHeader } : {},
        ),
      );

      const result = await adapter.getRemoteContentMessageAttachment(
        baseURL,
        authentication,
        messageID,
        attachmentURL,
        fiscalCode,
      );

      expect(result.isErr()).toBe(true);
      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(RemoteContentServiceUnavailableError);
      expect(error).toMatchObject({ retryAfter: expectedRetryAfter });
      expect(trackEventMock).toHaveBeenCalledExactlyOnceWith({
        name: "RemoteContentHTTPAdapter.getRemoteContentMessageAttachment.failed.serviceUnavailable",
        properties: {
          attachmentURL,
          baseURL: baseURL.toString(),
          messageID,
        },
      });
    },
  );

  it("returns a GenericError on an unexpected attachment response status", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 418));

    const result = await adapter.getRemoteContentMessageAttachment(
      baseURL,
      authentication,
      messageID,
      attachmentURL,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: The Remote Content service returned an unexpected HTTP status.",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});

describe("RemoteContentHTTPAdapter - response-less attachment errors", () => {
  it("returns a GenericError when the attachment request has no response", async () => {
    fetchMock.mockRejectedValue("network error");

    const result = await adapter.getRemoteContentMessageAttachment(
      baseURL,
      authentication,
      messageID,
      attachmentURL,
      fiscalCode,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toBe(
      "Generic error: network error",
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});
