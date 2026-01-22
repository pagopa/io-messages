import { HttpRequest } from "@azure/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  TelemetryEventName,
  TelemetryService,
} from "../../../domain/telemetry.js";
import { MiddlewareError } from "../../middleware.js";
import {
  aFiscalCode,
  aSignatureInput,
  aThumbprint,
  anAssertionRef,
  anLcParams,
} from "../__mocks__/lollipop.js";
import LollipopClient, { LollipopClientError } from "../lollipop-client.js";
import { parseLollipopHeaders } from "../lollipop-middleware.js";

const createMockRequest = (headers: Record<string, string>): HttpRequest =>
  new HttpRequest({
    headers: headers,
    method: "POST",
    url: "https://api.example.com/test",
  });

const createValidUserIdentity = (assertionRef?: string) => ({
  assertion_ref: assertionRef,
  date_of_birth: "1997-10-06",
  family_name: "Rossi",
  fiscal_code: aFiscalCode,
  name: "Mario",
  spid_level: "https://www.spid.gov.it/SpidL2",
});

const createValidLollipopHeaders = (
  signatureInput?: string,
): Record<string, string> => ({
  signature: "sig1=:mockSignature:",
  "signature-input": signatureInput || aSignatureInput,
  "x-pagopa-lollipop-original-method": "POST",
  "x-pagopa-lollipop-original-url": "https://api.example.com/endpoint",
});

describe("parseLollipopHeaders successful parsing", () => {
  let mockLollipopClient: LollipopClient;
  let mockTelemetryService: TelemetryService;

  beforeEach(() => {
    mockLollipopClient = {
      generateLCParams: vi.fn().mockResolvedValue(anLcParams),
    } as unknown as LollipopClient;

    mockTelemetryService = {
      trackEvent: vi.fn(),
    };
  });

  it("should successfully parse valid lollipop headers with sha256 algorithm", async () => {
    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": userHeader,
    });

    const result = await parseLollipopHeaders(
      req,
      mockLollipopClient,
      mockTelemetryService,
    );

    expect(result).toEqual({
      signature: "sig1=:mockSignature:",
      "signature-input": aSignatureInput,
      "x-pagopa-lollipop-assertion-ref": anLcParams.assertion_ref,
      "x-pagopa-lollipop-assertion-type": anLcParams.assertion_type,
      "x-pagopa-lollipop-auth-jwt": anLcParams.lc_authentication_bearer,
      "x-pagopa-lollipop-original-method": "POST",
      "x-pagopa-lollipop-original-url": "https://api.example.com/endpoint",
      "x-pagopa-lollipop-public-key": anLcParams.pub_key,
      "x-pagopa-lollipop-user-id": aFiscalCode,
    });

    expect(mockLollipopClient.generateLCParams).toHaveBeenCalledWith(
      anAssertionRef,
      expect.any(String),
    );
    expect(mockTelemetryService.trackEvent).not.toHaveBeenCalled();
  });

  it("should successfully parse headers with sha384 algorithm", async () => {
    const sha384Thumbprint =
      "abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef";
    const sha384AssertionRef = `sha384-${sha384Thumbprint}`;
    const sha384SignatureInput = `sig1=(); keyid="${sha384Thumbprint}"; nonce="test-nonce-123"`;

    const userIdentity = createValidUserIdentity(sha384AssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(sha384SignatureInput),
      "x-user": userHeader,
    });

    const lcParams = { ...anLcParams, assertion_ref: sha384AssertionRef };
    vi.mocked(mockLollipopClient.generateLCParams).mockResolvedValue(lcParams);

    const result = await parseLollipopHeaders(
      req,
      mockLollipopClient,
      mockTelemetryService,
    );

    expect(result["x-pagopa-lollipop-assertion-ref"]).toBe(sha384AssertionRef);
    expect(mockLollipopClient.generateLCParams).toHaveBeenCalledWith(
      sha384AssertionRef,
      "test-nonce-123",
    );
  });

  it("should successfully parse headers with sha512 algorithm", async () => {
    const sha512Thumbprint =
      "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890123456789";
    const sha512AssertionRef = `sha512-${sha512Thumbprint}`;
    const sha512SignatureInput = `sig1=(); keyid="${sha512Thumbprint}"`;

    const userIdentity = createValidUserIdentity(sha512AssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(sha512SignatureInput),
      "x-user": userHeader,
    });

    const lcParams = { ...anLcParams, assertion_ref: sha512AssertionRef };
    vi.mocked(mockLollipopClient.generateLCParams).mockResolvedValue(lcParams);

    const result = await parseLollipopHeaders(
      req,
      mockLollipopClient,
      mockTelemetryService,
    );

    expect(result["x-pagopa-lollipop-assertion-ref"]).toBe(sha512AssertionRef);
  });

  it("should generate a ULID as operationId when nonce is not present in signature-input", async () => {
    const signatureInputWithoutNonce = `sig1=(); keyid="${aThumbprint}"`;
    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(signatureInputWithoutNonce),
      "x-user": userHeader,
    });

    await parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService);

    const operationId = vi.mocked(mockLollipopClient.generateLCParams).mock
      .calls[0][1];
    expect(operationId).toBeTruthy();
    expect(typeof operationId).toBe("string");
    expect(operationId.length).toBe(26);
  });
});

describe("parseLollipopHeaders invalid request headers", () => {
  let mockLollipopClient: LollipopClient;
  let mockTelemetryService: TelemetryService;

  beforeEach(() => {
    mockLollipopClient = {
      generateLCParams: vi.fn().mockResolvedValue(anLcParams),
    } as unknown as LollipopClient;

    mockTelemetryService = {
      trackEvent: vi.fn(),
    };
  });

  it("should throw MiddlewareError when lollipop request headers are missing", async () => {
    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      "x-user": userHeader,
      // Missing lollipop headers
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(
      new MiddlewareError("Missing or invalid required lollipop headers", 403),
    );

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 403 }),
    );
  });

  it("should throw MiddlewareError when signature header is missing", async () => {
    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const headers = createValidLollipopHeaders();
    const req = createMockRequest({
      "signature-input": headers["signature-input"],
      "x-pagopa-lollipop-original-method":
        headers["x-pagopa-lollipop-original-method"],
      "x-pagopa-lollipop-original-url":
        headers["x-pagopa-lollipop-original-url"],
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(MiddlewareError);

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 403 }),
    );
  });

  it("should throw MiddlewareError when signature-input header is missing", async () => {
    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const headers = createValidLollipopHeaders();
    const req = createMockRequest({
      signature: headers.signature,
      "x-pagopa-lollipop-original-method":
        headers["x-pagopa-lollipop-original-method"],
      "x-pagopa-lollipop-original-url":
        headers["x-pagopa-lollipop-original-url"],
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(MiddlewareError);

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 403 }),
    );
  });

  it("should throw MiddlewareError when x-pagopa-lollipop-original-method is missing", async () => {
    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const headers = createValidLollipopHeaders();
    const req = createMockRequest({
      signature: headers.signature,
      "signature-input": headers["signature-input"],
      "x-pagopa-lollipop-original-url":
        headers["x-pagopa-lollipop-original-url"],
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(MiddlewareError);

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 403 }),
    );
  });

  it("should throw MiddlewareError when x-pagopa-lollipop-original-url is missing", async () => {
    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const headers = createValidLollipopHeaders();
    const req = createMockRequest({
      signature: headers.signature,
      "signature-input": headers["signature-input"],
      "x-pagopa-lollipop-original-method":
        headers["x-pagopa-lollipop-original-method"],
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(MiddlewareError);

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 403 }),
    );
  });
});

describe("parseLollipopHeaders invalid x-user header", () => {
  let mockLollipopClient: LollipopClient;
  let mockTelemetryService: TelemetryService;

  beforeEach(() => {
    mockLollipopClient = {
      generateLCParams: vi.fn().mockResolvedValue(anLcParams),
    } as unknown as LollipopClient;

    mockTelemetryService = {
      trackEvent: vi.fn(),
    };
  });

  it("should throw MiddlewareError when x-user header is missing", async () => {
    const req = createMockRequest({
      ...createValidLollipopHeaders(),
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(new MiddlewareError("Missing x-user header", 401));

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 401 }),
    );
  });

  it("should throw MiddlewareError when x-user header is not valid base64", async () => {
    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": "not-valid-base64!@#",
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow();
  });

  it("should throw MiddlewareError when x-user header contains invalid JSON", async () => {
    const invalidJson = Buffer.from("not valid json").toString("base64");

    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": invalidJson,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow();
  });

  it("should throw MiddlewareError when user identity is invalid", async () => {
    const invalidUserIdentity = {
      // Missing required fields
      fiscal_code: aFiscalCode,
    };
    const userHeader = Buffer.from(
      JSON.stringify(invalidUserIdentity),
    ).toString("base64");

    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(MiddlewareError);

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 401 }),
    );
  });

  it("should throw MiddlewareError when fiscal_code is invalid", async () => {
    const invalidUserIdentity = {
      ...createValidUserIdentity(anAssertionRef),
      fiscal_code: "INVALID",
    };
    const userHeader = Buffer.from(
      JSON.stringify(invalidUserIdentity),
    ).toString("base64");

    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(MiddlewareError);

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 401 }),
    );
  });
});

describe("parseLollipopHeaders assertion_ref validation", () => {
  let mockLollipopClient: LollipopClient;
  let mockTelemetryService: TelemetryService;

  beforeEach(() => {
    mockLollipopClient = {
      generateLCParams: vi.fn().mockResolvedValue(anLcParams),
    } as unknown as LollipopClient;

    mockTelemetryService = {
      trackEvent: vi.fn(),
    };
  });
  it("should throw MiddlewareError when assertion_ref is missing", async () => {
    const userIdentity = createValidUserIdentity(); // No assertion_ref
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(new MiddlewareError("AssertionRef is missing", 403));

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 403 }),
    );
  });

  it("should throw MiddlewareError when assertion_ref has invalid format", async () => {
    // Create a user identity with an invalid assertion_ref that won't match any schema
    const invalidUserIdentity = {
      assertion_ref: `sha1-${aThumbprint}`, // sha1 is not supported
      date_of_birth: "1997-10-06",
      family_name: "Rossi",
      fiscal_code: aFiscalCode,
      name: "Mario",
      spid_level: "https://www.spid.gov.it/SpidL2",
    };
    const userHeader = Buffer.from(
      JSON.stringify(invalidUserIdentity),
    ).toString("base64");

    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(MiddlewareError);

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 401 }),
    );
  });

  it("should throw MiddlewareError when assertion_ref doesn't match algo-thumbprint format", async () => {
    const mismatchedAssertionRef = `sha256-wrongThumbprint`;
    const userIdentity = createValidUserIdentity(mismatchedAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(new MiddlewareError("AssertionRef mismatch", 403));

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_MALFORMED_HEADERS_ERROR,
      expect.objectContaining({ status: 403 }),
    );
  });
});

describe("parseLollipopHeaders signature-input validation", () => {
  let mockLollipopClient: LollipopClient;
  let mockTelemetryService: TelemetryService;

  beforeEach(() => {
    mockLollipopClient = {
      generateLCParams: vi.fn().mockResolvedValue(anLcParams),
    } as unknown as LollipopClient;

    mockTelemetryService = {
      trackEvent: vi.fn(),
    };
  });
  it("should throw MiddlewareError when keyid is invalid in signature-input", async () => {
    const invalidSignatureInput = `sig1=(); keyid="invalid!@#$%"`;
    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(invalidSignatureInput),
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(
      new MiddlewareError("Invalid keyid in signature-input", 500),
    );
  });

  it("should throw MiddlewareError when keyid is missing in signature-input", async () => {
    const noKeyidSignatureInput = `sig1=(); nonce="test"`;
    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(noKeyidSignatureInput),
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(
      new MiddlewareError("Invalid keyid in signature-input", 500),
    );
  });
});

describe("LollipopClient errors", () => {
  let mockLollipopClient: LollipopClient;
  let mockTelemetryService: TelemetryService;

  beforeEach(() => {
    mockLollipopClient = {
      generateLCParams: vi.fn().mockResolvedValue(anLcParams),
    } as unknown as LollipopClient;

    mockTelemetryService = {
      trackEvent: vi.fn(),
    };
  });
  it("should throw MiddlewareError when LollipopClient.generateLCParams fails with LollipopClientError", async () => {
    const clientError = new LollipopClientError("Error generating LC params", {
      detail: "Internal error",
      status: 500,
    });
    vi.mocked(mockLollipopClient.generateLCParams).mockRejectedValue(
      clientError,
    );

    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow(
      expect.objectContaining({
        body: { detail: "Internal error", status: 500 },
        message: "Error generating LC params",
        status: 500,
      }),
    );

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_GET_LC_PARAMS_ERROR,
      expect.objectContaining({ status: 500 }),
    );
  });

  it("should throw generic Error when LollipopClient.generateLCParams fails with unexpected error", async () => {
    const unexpectedError = new Error("Network error");
    vi.mocked(mockLollipopClient.generateLCParams).mockRejectedValue(
      unexpectedError,
    );

    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": userHeader,
    });

    await expect(
      parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService),
    ).rejects.toThrow("Unexpected Middleware error | Error: Network error");

    expect(mockTelemetryService.trackEvent).toHaveBeenCalledWith(
      TelemetryEventName.LOLLIPOP_MIDDLEWARE_GENERIC_SERVER_ERROR,
    );
  });
});

describe("parseLollipopHeaders edge cases", () => {
  let mockLollipopClient: LollipopClient;
  let mockTelemetryService: TelemetryService;

  beforeEach(() => {
    mockLollipopClient = {
      generateLCParams: vi.fn().mockResolvedValue(anLcParams),
    } as unknown as LollipopClient;

    mockTelemetryService = {
      trackEvent: vi.fn(),
    };
  });

  it("should handle signature-input with nonce containing special characters", async () => {
    const specialNonce = "test-nonce-with-special_chars.123";
    const signatureInput = `sig1=(); keyid="${aThumbprint}"; nonce="${specialNonce}"`;

    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(signatureInput),
      "x-user": userHeader,
    });

    await parseLollipopHeaders(req, mockLollipopClient, mockTelemetryService);

    expect(mockLollipopClient.generateLCParams).toHaveBeenCalledWith(
      anAssertionRef,
      specialNonce,
    );
  });

  it("should handle signature-input with parameters in different order", async () => {
    const signatureInput = `sig1=(); nonce="test"; keyid="${aThumbprint}"`;

    const userIdentity = createValidUserIdentity(anAssertionRef);
    const userHeader = Buffer.from(JSON.stringify(userIdentity)).toString(
      "base64",
    );

    const req = createMockRequest({
      ...createValidLollipopHeaders(signatureInput),
      "x-user": userHeader,
    });

    const result = await parseLollipopHeaders(
      req,
      mockLollipopClient,
      mockTelemetryService,
    );

    expect(result).toBeDefined();
    expect(mockLollipopClient.generateLCParams).toHaveBeenCalledWith(
      anAssertionRef,
      "test",
    );
  });

  it("should handle optional user identity fields", async () => {
    const userIdentityWithOptionals = {
      ...createValidUserIdentity(anAssertionRef),
      session_tracking_id: "session-123",
      spid_email: "test@example.com",
      spid_idp: "testIdp",
    };
    const userHeader = Buffer.from(
      JSON.stringify(userIdentityWithOptionals),
    ).toString("base64");

    const req = createMockRequest({
      ...createValidLollipopHeaders(),
      "x-user": userHeader,
    });

    const result = await parseLollipopHeaders(
      req,
      mockLollipopClient,
      mockTelemetryService,
    );

    expect(result).toBeDefined();
    expect(result["x-pagopa-lollipop-user-id"]).toBe(aFiscalCode);
  });
});
